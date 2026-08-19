import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Download, Image as ImageIcon, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import type { Collaborator } from "@/lib/types";
import { decodePhone, encodePhone } from "@/lib/types";
import { EmailSignaturePreview } from "@/components/email-signature-preview";
import { slugify, validateSlug } from "@/lib/slug";
import {
  downloadSignaturePng,
  downloadSignaturesBatch,
  loadSignatureOptions,
  openSignaturePng,
  type SignatureOptions,
} from "@/lib/email-signature";

export const Route = createFileRoute("/_authenticated/cartao/assinatura")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assinatura de E-mail | Conexão Implantes" },
      {
        name: "description",
        content:
          "Visualize, ajuste e baixe em PNG as artes de assinatura de e-mail 150x50mm dos colaboradores.",
      },
      { property: "og:title", content: "Assinatura de E-mail | Conexão Implantes" },
      {
        property: "og:description",
        content: "Pré-visualização e geração das assinaturas de e-mail da equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/cartao/assinatura" });

  const [rows, setRows] = useState<Collaborator[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(search.id ?? null);
  const [opts, setOpts] = useState<SignatureOptions>({});

  const [draft, setDraft] = useState({
    nome_cartao: "",
    cargo: "",
    email: "",
    ddi: "",
    ddd: "",
    numero: "",
    slug: "",
  });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"one" | "batch" | "view" | null>(null);

  const canEdit = can("dashboard.edit");

  useEffect(() => {
    if (!permLoading && !can("assinatura.view")) {
      toast.error("Você não tem permissão para acessar esta área");
      navigate({ to: "/cartao/tema", replace: true });
    }
  }, [permLoading, can, navigate]);

  useEffect(() => {
    loadSignatureOptions()
      .then(setOpts)
      .catch(() => setOpts({}));
    supabase
      .from("collaborators")
      .select("*")
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro ao carregar colaboradores", { description: error.message });
          return;
        }
        const list = (data ?? []) as Collaborator[];
        setRows(list);
        setActiveId((prev) => prev ?? list[0]?.id ?? null);
      });
  }, []);

  const active = useMemo(
    () => (rows ?? []).find((r) => r.id === activeId) ?? null,
    [rows, activeId],
  );

  useEffect(() => {
    if (!active) return;
    const p = decodePhone(active.whatsapp);
    setDraft({
      nome_cartao: active.nome_cartao ?? "",
      cargo: active.cargo ?? "",
      email: active.email ?? "",
      ddi: p.ddi,
      ddd: p.ddd,
      numero: p.number,
      slug: active.slug ?? "",
    });
  }, [active?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        (r.cargo ?? "").toLowerCase().includes(q) ||
        (r.slug ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  const previewCard = active
    ? {
        nome: active.nome,
        nome_cartao: draft.nome_cartao || active.nome_cartao,
        cargo: draft.cargo || active.cargo,
        email: draft.email || active.email,
        whatsapp: encodePhone({ ddi: draft.ddi, ddd: draft.ddd, number: draft.numero }),
        slug: draft.slug || active.slug,
      }
    : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)),
    );
  }

  async function handleSave() {
    if (!active) return;
    const slug = slugify(draft.slug);
    const err = validateSlug(slug);
    if (err) {
      toast.error(err);
      return;
    }
    if (!draft.cargo.trim()) {
      toast.error("Informe o cargo");
      return;
    }
    if (!draft.email.trim()) {
      toast.error("Informe o e-mail");
      return;
    }
    const whatsapp = encodePhone({ ddi: draft.ddi, ddd: draft.ddd, number: draft.numero });
    setSaving(true);
    const { error } = await supabase
      .from("collaborators")
      .update({
        nome_cartao: draft.nome_cartao.trim() || null,
        cargo: draft.cargo.trim(),
        email: draft.email.trim(),
        whatsapp,
        slug,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", {
        description: error.message.includes("duplicate")
          ? "Este apelido de link já está em uso."
          : error.message,
      });
      return;
    }
    setRows((prev) =>
      (prev ?? []).map((r) =>
        r.id === active.id
          ? {
              ...r,
              nome_cartao: draft.nome_cartao.trim() || null,
              cargo: draft.cargo.trim(),
              email: draft.email.trim(),
              whatsapp,
              slug,
            }
          : r,
      ),
    );
    toast.success("Dados da assinatura atualizados");
  }

  async function handleView() {
    if (!previewCard) return;
    setBusy("view");
    try {
      await openSignaturePng(previewCard, opts);
    } catch (e: any) {
      toast.error("Falha ao gerar a arte", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadOne() {
    if (!previewCard) return;
    setBusy("one");
    try {
      await downloadSignaturePng(previewCard, opts);
      toast.success("Assinatura gerada em PNG");
    } catch (e: any) {
      toast.error("Falha ao gerar a assinatura", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadBatch() {
    const items = (rows ?? []).filter((r) => selected.has(r.id));
    if (!items.length) {
      toast.error("Selecione ao menos um colaborador");
      return;
    }
    setBusy("batch");
    try {
      await downloadSignaturesBatch(items, opts);
      toast.success(`${items.length} assinaturas geradas`);
    } catch (e: any) {
      toast.error("Falha ao gerar as assinaturas", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  if (permLoading || rows === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[color:var(--text-muted)]">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">
          Assinatura de E-mail
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Confira a arte 150×50&nbsp;mm antes de baixar, ajuste os dados do colaborador e gere os
          arquivos PNG prontos para o cliente de e-mail.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ------------------------------ Lista ------------------------------ */}
        <aside className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar colaborador..."
              className="pl-9"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-muted)]">
            <button className="hover:underline" onClick={toggleAll} type="button">
              {selected.size === filtered.length && filtered.length > 0
                ? "Limpar seleção"
                : "Selecionar todos"}
            </button>
            <span>{selected.size} selecionado(s)</span>
          </div>

          <ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto pr-1">
            {filtered.map((r) => {
              const isActive = r.id === activeId;
              return (
                <li key={r.id}>
                  <div
                    className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-[color:var(--surface-hover)] text-[color:var(--text-main)]"
                        : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)]"
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggle(r.id)}
                      aria-label={`Selecionar ${r.nome}`}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setActiveId(r.id)}
                    >
                      <div className="truncate font-medium text-[color:var(--text-main)]">
                        {r.nome_cartao || r.nome}
                      </div>
                      <div className="truncate text-xs">{r.cargo}</div>
                    </button>
                  </div>
                </li>
              );
            })}
            {!filtered.length && (
              <li className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                Nenhum colaborador encontrado.
              </li>
            )}
          </ul>

          <Button
            className="mt-4 w-full gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
            onClick={handleDownloadBatch}
            disabled={busy !== null || !selected.size}
          >
            {busy === "batch" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Baixar selecionados
          </Button>
        </aside>

        {/* ------------------------------ Preview ------------------------------ */}
        <section className="space-y-5 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
          {!previewCard ? (
            <p className="text-sm text-[color:var(--text-muted)]">
              Selecione um colaborador na lista para visualizar a arte.
            </p>
          ) : (
            <>
              <figure className="space-y-2 overflow-x-auto">
                <EmailSignaturePreview card={previewCard} bgUrl={opts.bgUrl} scale={3.2} />
                <figcaption className="text-xs text-[color:var(--text-muted)]">
                  Pré-visualização em escala — o arquivo é exportado em 150×50&nbsp;mm (300&nbsp;dpi,
                  1772×591&nbsp;px).
                </figcaption>
              </figure>

              <div className="grid gap-4 border-t border-[color:var(--border-strong)] pt-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nome_cartao">Nome na assinatura</Label>
                  <Input
                    id="nome_cartao"
                    value={draft.nome_cartao}
                    disabled={!canEdit}
                    placeholder={active?.nome}
                    onChange={(e) => setDraft((d) => ({ ...d, nome_cartao: e.target.value }))}
                  />
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Vazio usa o nome completo do colaborador.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input
                    id="cargo"
                    value={draft.cargo}
                    disabled={!canEdit}
                    onChange={(e) => setDraft((d) => ({ ...d, cargo: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={draft.email}
                    disabled={!canEdit}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Celular</Label>
                  <div className="flex gap-2">
                    <Input
                      aria-label="DDI"
                      className="w-16"
                      value={draft.ddi}
                      disabled={!canEdit}
                      placeholder="55"
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, ddi: e.target.value.replace(/\D/g, "").slice(0, 3) }))
                      }
                    />
                    <Input
                      aria-label="DDD"
                      className="w-16"
                      value={draft.ddd}
                      disabled={!canEdit}
                      placeholder="11"
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, ddd: e.target.value.replace(/\D/g, "").slice(0, 3) }))
                      }
                    />
                    <Input
                      aria-label="Número"
                      value={draft.numero}
                      disabled={!canEdit}
                      placeholder="988776655"
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          numero: e.target.value.replace(/\D/g, "").slice(0, 9),
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="slug">Apelido do link (QR Code)</Label>
                  <Input
                    id="slug"
                    value={draft.slug}
                    disabled={!canEdit}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                    onBlur={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSave} disabled={!canEdit || saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleView} disabled={busy !== null}>
                  {busy === "view" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  Ver arte real
                </Button>
                <Button
                  onClick={handleDownloadOne}
                  disabled={busy !== null}
                  className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
                >
                  {busy === "one" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Baixar PNG
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
