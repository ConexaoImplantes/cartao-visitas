import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer, FileText, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import type { Collaborator } from "@/lib/types";
import { PrintCardPreview } from "@/components/print-card-preview";
import { slugify, validateSlug } from "@/lib/slug";
import {
  downloadPrintCard,
  downloadPrintCardsBatch,
  loadPrintOptions,
  openPrintCardPdf,
  type PrintBackgrounds,
} from "@/lib/print-card";

export const Route = createFileRoute("/_authenticated/cartao/cartao-fisico")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cartão de Visitas Físico | Conexão Implantes" },
      {
        name: "description",
        content:
          "Visualize, ajuste e baixe as artes de impressão dos cartões de visita 90x48mm dos colaboradores.",
      },
      { property: "og:title", content: "Cartão de Visitas Físico | Conexão Implantes" },
      {
        property: "og:description",
        content: "Pré-visualização e geração dos cartões de visita impressos da equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartaoFisicoPage,
});

function CartaoFisicoPage() {
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/cartao/cartao-fisico" });

  const [rows, setRows] = useState<Collaborator[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(search.id ?? null);
  const [bgs, setBgs] = useState<PrintBackgrounds>({});

  const [draft, setDraft] = useState({ nome_cartao: "", cargo: "", slug: "" });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"one" | "batch" | "pdf" | null>(null);

  const canEdit = can("dashboard.edit");

  useEffect(() => {
    if (!permLoading && !can("dashboard.view")) {
      toast.error("Você não tem permissão para acessar esta área");
      navigate({ to: "/cartao/tema", replace: true });
    }
  }, [permLoading, can, navigate]);

  useEffect(() => {
    loadPrintOptions().then(setBgs).catch(() => setBgs({}));
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
    setDraft({
      nome_cartao: active.nome_cartao ?? "",
      cargo: active.cargo ?? "",
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
    if (!active || !previewCard) return;
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
    setSaving(true);
    const { error } = await supabase
      .from("collaborators")
      .update({
        nome_cartao: draft.nome_cartao.trim() || null,
        cargo: draft.cargo.trim(),
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
          ? { ...r, nome_cartao: draft.nome_cartao.trim() || null, cargo: draft.cargo.trim(), slug }
          : r,
      ),
    );
    toast.success("Dados do cartão atualizados");
  }

  async function handleOpenPdf() {
    if (!previewCard) return;
    setBusy("pdf");
    try {
      await openPrintCardPdf([previewCard], bgs);
    } catch (e: any) {
      toast.error("Falha ao gerar o PDF", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadOne() {
    if (!previewCard) return;
    setBusy("one");
    try {
      await downloadPrintCard(previewCard, bgs);
      toast.success("Cartão gerado para impressão");
    } catch (e: any) {
      toast.error("Falha ao gerar o cartão", { description: e?.message });
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
      await downloadPrintCardsBatch(items, bgs);
      toast.success(`${items.length} cartões gerados para impressão`);
    } catch (e: any) {
      toast.error("Falha ao gerar os cartões", { description: e?.message });
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
          Cartão de Visitas Físico
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Confira a arte 90×48&nbsp;mm antes de imprimir, ajuste os dados do cartão e baixe os PDFs
          com sangria e prova de cor.
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
              <Printer className="size-4" />
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
              <div className="flex flex-wrap gap-6">
                <figure className="space-y-2">
                  <PrintCardPreview card={previewCard} {...bgs} side="frente" scale={5} />
                  <figcaption className="text-center text-xs text-[color:var(--text-muted)]">
                    Frente
                  </figcaption>
                </figure>
                <figure className="space-y-2">
                  <PrintCardPreview card={previewCard} {...bgs} side="verso" scale={5} />
                  <figcaption className="text-center text-xs text-[color:var(--text-muted)]">
                    Verso
                  </figcaption>
                </figure>
              </div>

              <div className="grid gap-4 border-t border-[color:var(--border-strong)] pt-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nome_cartao">Nome no cartão</Label>
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
                <Button variant="outline" onClick={handleOpenPdf} disabled={busy !== null}>
                  {busy === "pdf" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  Ver PDF real
                </Button>
                <Button
                  onClick={handleDownloadOne}
                  disabled={busy !== null}
                  className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
                >
                  {busy === "one" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Printer className="size-4" />
                  )}
                  Baixar este cartão
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
