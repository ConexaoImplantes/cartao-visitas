import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Package, ArrowRight, CircleDashed } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import type { Collaborator } from "@/lib/types";
import {
  KIT_STEPS,
  kitStatus,
  loadKitOptions,
  downloadKitZip,
  downloadKitZipBatch,
  type KitOptions,
} from "@/lib/kit";

export const Route = createFileRoute("/_authenticated/cartao/fluxo")({
  head: () => ({
    meta: [
      { title: "Fluxo do colaborador — Kit completo | Conexão" },
      {
        name: "description",
        content:
          "Acompanhe o passo a passo dos materiais do colaborador e baixe o kit completo em ZIP.",
      },
      { property: "og:title", content: "Fluxo do colaborador — Kit completo" },
      {
        property: "og:description",
        content: "Foto de perfil, Link Tree, assinatura de e-mail e cartão de visitas em um só kit.",
      },
    ],
  }),
  component: FluxoPage,
});

function FluxoPage() {
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Collaborator[] | null>(null);
  const [opts, setOpts] = useState<KitOptions | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!permLoading && !can("fluxo.view")) {
      toast.error("Você não tem permissão para acessar o Fluxo");
      navigate({ to: "/cartao/dashboard", replace: true });
    }
  }, [permLoading, can, navigate]);

  useEffect(() => {
    supabase
      .from("collaborators")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro ao carregar colaboradores", { description: error.message });
          return;
        }
        const list = (data ?? []) as Collaborator[];
        setRows(list);
        setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      });
    loadKitOptions()
      .then(setOpts)
      .catch(() => setOpts({ print: {}, signature: {} }));
  }, []);

  const selected = useMemo(
    () => rows?.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );
  const status = useMemo(
    () => (selected ? kitStatus(selected, opts ?? undefined) : null),
    [selected, opts],
  );
  const readyList = useMemo(
    () => (rows ?? []).filter((c) => kitStatus(c, opts ?? undefined).ready),
    [rows, opts],
  );

  async function handleKit(c: Collaborator) {
    if (!opts) return;
    setBusyId(c.id);
    try {
      await downloadKitZip(c, opts, setProgress);
      toast.success("Kit gerado", { description: `Arquivo ZIP de ${c.nome} baixado.` });
    } catch (e: any) {
      toast.error("Falha ao gerar o kit", { description: e?.message });
    } finally {
      setBusyId(null);
      setProgress("");
    }
  }

  async function handleBatch() {
    if (!opts || readyList.length === 0) return;
    setBatchBusy(true);
    try {
      await downloadKitZipBatch(readyList, opts, setProgress);
      toast.success(`${readyList.length} kits gerados`);
    } catch (e: any) {
      toast.error("Falha ao gerar os kits", { description: e?.message });
    } finally {
      setBatchBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">
            Fluxo do colaborador
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Foto de perfil → Link Tree → Assinatura de e-mail → Cartão de visitas. Ao concluir, baixe
            o kit completo em ZIP.
          </p>
        </div>
        {can("fluxo.download_kit") && (
          <Button
            onClick={handleBatch}
            disabled={batchBusy || readyList.length === 0 || !opts}
            className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
          >
            {batchBusy ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
            Kits prontos ({readyList.length})
          </Button>
        )}
      </header>

      {progress && (
        <div className="rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 py-2 text-xs text-[color:var(--text-muted)]">
          {progress}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <div className="border-b border-[color:var(--border-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
            Colaboradores
          </div>
          {rows === null ? (
            <div className="flex items-center justify-center p-8 text-[color:var(--text-muted)]">
              <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-[color:var(--text-muted)]">
              Nenhum colaborador cadastrado.
            </div>
          ) : (
            <ul className="max-h-[560px] overflow-y-auto">
              {rows.map((c) => {
                const s = kitStatus(c, opts ?? undefined);
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-3 border-b border-[color:var(--border-strong)] px-4 py-3 text-left transition ${
                        active
                          ? "bg-[color:var(--surface-hover)]"
                          : "hover:bg-[color:var(--surface-hover)]/60"
                      }`}
                    >
                      <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[color:var(--surface-hover)]">
                        {c.foto_url ? (
                          <img src={c.foto_url} alt={c.nome} className="size-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold">{c.nome.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[color:var(--text-main)]">
                          {c.nome}
                        </div>
                        <div className="truncate text-xs text-[color:var(--text-muted)]">
                          {c.cargo}
                        </div>
                      </div>
                      <ProgressDots completed={s.completed} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="space-y-4">
          {!selected || !status ? (
            <div className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-12 text-center text-sm text-[color:var(--text-muted)]">
              Selecione um colaborador para ver o progresso.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[color:var(--text-main)]">
                      {selected.nome}
                    </h2>
                    <p className="text-sm text-[color:var(--text-muted)]">{selected.cargo}</p>
                  </div>
                  <span className="rounded-full bg-[color:var(--surface-hover)] px-3 py-1 text-xs font-medium text-[color:var(--text-muted)]">
                    {status.completed} de {KIT_STEPS.length} etapas concluídas
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--surface-hover)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--accent)] transition-all"
                    style={{ width: `${(status.completed / KIT_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>

              <ol className="space-y-3">
                {KIT_STEPS.map((step) => {
                  const st = status.steps[step.key];
                  return (
                    <li
                      key={step.key}
                      className="flex flex-wrap items-center gap-4 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-4"
                    >
                      <div
                        className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
                        style={{
                          background: st.done ? "var(--success)20" : "var(--surface-hover)",
                          color: st.done ? "var(--success)" : "var(--text-muted)",
                        }}
                      >
                        {st.done ? <Check className="size-4" /> : step.order}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[color:var(--text-main)]">{step.label}</div>
                        <div className="text-xs text-[color:var(--text-muted)]">
                          {st.done ? step.description : st.reason}
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={step.route} search={{ id: selected.id }}>
                          {st.done ? "Revisar" : "Concluir"}
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </li>
                  );
                })}
              </ol>

              {can("fluxo.download_kit") && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
                  <div>
                    <div className="font-medium text-[color:var(--text-main)]">Kit completo (ZIP)</div>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Manual em PDF + foto de perfil (PNG 1080x1080) + assinatura (PNG 1772x591) +
                      cartão de visitas (PDF) + QR Code.
                    </p>
                  </div>
                  <Button
                    onClick={() => handleKit(selected)}
                    disabled={!status.ready || busyId === selected.id || !opts}
                    className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
                  >
                    {busyId === selected.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Package className="size-4" />
                    )}
                    Baixar kit
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ProgressDots({ completed }: { completed: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {KIT_STEPS.map((s, i) =>
        i < completed ? (
          <Check key={s.key} className="size-3 text-[color:var(--success)]" />
        ) : (
          <CircleDashed key={s.key} className="size-3 text-[color:var(--text-muted)]" />
        ),
      )}
    </span>
  );
}
