import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ExternalLink, Trash2, Loader2, Share2, Printer, CreditCard } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import type { Collaborator } from "@/lib/types";
import { CollaboratorModal } from "@/components/collaborator-modal";
import { ShareDialog } from "@/components/share-dialog";
import { buildCardUrl } from "@/lib/qr";
import { fetchCardStats, type CardStats } from "@/lib/analytics";
import {
  downloadPrintCard,
  loadPrintOptions,
  type PrintBackgrounds,
} from "@/lib/print-card";

const PERIODS: Array<{ label: string; days: number | null }> = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "Total", days: null },
];


export const Route = createFileRoute("/_authenticated/cartao/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Collaborator[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);
  const [toDelete, setToDelete] = useState<Collaborator | null>(null);
  const [sharing, setSharing] = useState<Collaborator | null>(null);
  const [period, setPeriod] = useState<number | null>(30);
  const [stats, setStats] = useState<Record<string, CardStats>>({});
  const [printing, setPrinting] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  async function printOptions(): Promise<PrintBackgrounds> {
    try {
      return await loadPrintOptions();
    } catch {
      return {};
    }
  }

  async function handlePrintOne(c: Collaborator) {
    setPrintingId(c.id);
    try {
      await downloadPrintCard(c, await printOptions());
      toast.success("Cartão gerado para impressão");
    } catch (e: any) {
      toast.error("Falha ao gerar o cartão", { description: e?.message });
    } finally {
      setPrintingId(null);
    }
  }


  useEffect(() => {
    if (!permLoading && !can("dashboard.view")) {
      toast.error("Você não tem permissão para acessar o Dashboard");
      navigate({ to: "/cartao/tema", replace: true });
    }
  }, [permLoading, can, navigate]);

  async function load() {
    const { data, error } = await supabase
      .from("collaborators")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar", { description: error.message });
      return;
    }
    setRows(data as Collaborator[]);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (permLoading || !can("dashboard.view")) return;
    fetchCardStats(period).then(setStats);
  }, [period, permLoading, can]);

  const totals = Object.values(stats).reduce(
    (acc, s) => ({
      views: acc.views + Number(s.views ?? 0),
      clicks: acc.clicks + Number(s.clicks ?? 0),
      whatsapp: acc.whatsapp + Number(s.whatsapp ?? 0),
      email: acc.email + Number(s.email ?? 0),
      telefone: acc.telefone + Number(s.telefone ?? 0),
    }),
    { views: 0, clicks: 0, whatsapp: 0, email: 0, telefone: 0 },
  );

  async function toggleStatus(c: Collaborator) {
    const next = c.status === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("collaborators").update({ status: next }).eq("id", c.id);
    if (error) {
      toast.error("Falha ao atualizar status");
      return;
    }
    setRows((prev) => prev?.map((r) => (r.id === c.id ? { ...r, status: next } : r)) ?? null);
  }

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("collaborators").delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Falha ao excluir", { description: error.message });
      return;
    }
    toast.success("Colaborador excluído");
    setToDelete(null);
    load();
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">
            Link Tree Corporativo
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Gerencie os cartões digitais e QR Codes dos colaboradores.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        {can("dashboard.create") && (
          <Button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="shrink-0 gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Novo Colaborador</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        )}
        </div>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-4">
        <div className="flex flex-wrap gap-6">
          <Metric label="Visitas" value={totals.views} />
          <Metric label="Cliques" value={totals.clicks} />
          <Metric label="WhatsApp" value={totals.whatsapp} />
          <Metric label="E-mail" value={totals.email} />
          <Metric label="Telefone" value={totals.telefone} />
        </div>
        <div className="flex gap-1 rounded-lg bg-[color:var(--surface-hover)] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.days)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                period === p.days
                  ? "bg-[color:var(--accent)] text-[color:var(--text-inverted)]"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text-main)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>



      <div className="overflow-hidden rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)]">
        {rows === null ? (
          <div className="flex items-center justify-center p-12 text-[color:var(--text-muted)]">
            <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-[color:var(--text-muted)]">
            Nenhum colaborador cadastrado ainda. Clique em <strong>Novo</strong> para começar.
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-sm md:table">
              <thead className="hidden text-left text-xs uppercase tracking-wide text-[color:var(--text-muted)] md:table-header-group">
                <tr className="border-b border-[color:var(--border-strong)]">
                  <th className="p-4">Colaborador</th>
                  <th className="hidden p-4 md:table-cell">Cargo</th>
                  <th className="hidden p-4 lg:table-cell">E-mail</th>
                  <th className="p-4">Métricas</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="mb-4 block rounded-xl border border-[color:var(--border-strong)] p-4 last:mb-0 hover:bg-[color:var(--surface-hover)]/50 md:mb-0 md:table-row md:border-b md:border-[color:var(--border-strong)] md:p-0 md:last:border-0"
                  >
                    <td className="block p-0 pb-3 md:table-cell md:p-4" data-label="Colaborador">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[color:var(--surface-hover)]">
                          {c.foto_url ? (
                            <img src={c.foto_url} alt={c.nome} className="size-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold">{c.nome.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[color:var(--text-main)]">{c.nome}</div>
                          <div className="truncate text-xs text-[color:var(--text-muted)] md:hidden">{c.cargo}</div>
                          <div className="truncate text-xs text-[color:var(--text-muted)] lg:hidden">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden p-4 text-[color:var(--text-muted)] md:table-cell">{c.cargo}</td>
                    <td className="hidden p-4 text-[color:var(--text-muted)] lg:table-cell">{c.email}</td>
                    <td className="block p-0 pb-3 pt-1 text-xs text-[color:var(--text-muted)] md:table-cell md:whitespace-nowrap md:p-4" data-label="Métricas">
                      <span className="font-semibold text-[color:var(--text-main)]">
                        {Number(stats[c.id]?.views ?? 0)}
                      </span>{" "}
                      visitas ·{" "}
                      <span className="font-semibold text-[color:var(--text-main)]">
                        {Number(stats[c.id]?.clicks ?? 0)}
                      </span>{" "}
                      cliques
                    </td>
                    <td className="block p-0 pb-3 md:table-cell md:p-4" data-label="Status">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={c.status === "ativo"}
                          onCheckedChange={() => toggleStatus(c)}
                          disabled={!can("dashboard.toggle_status")}
                        />
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            background: c.status === "ativo" ? "var(--success)20" : "var(--warning)20",
                            color: c.status === "ativo" ? "var(--success)" : "var(--warning)",
                          }}
                        >
                          {c.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </td>
                    <td className="block p-0 md:table-cell md:p-4" data-label="Ações">
                      <div className="grid grid-cols-5 gap-1 sm:flex sm:items-center sm:justify-end sm:gap-1 md:gap-1">
                        {can("dashboard.view_link") && (
                          <IconBtn title="Visualizar Link Tree" asChild>
                            <a href={buildCardUrl(c.slug)} target="_blank" rel="noreferrer">
                              <ExternalLink className="size-4" />
                            </a>
                          </IconBtn>
                        )}
                        {can("dashboard.view") && (
                          <IconBtn title="Ver / editar arte do cartão físico" asChild>
                            <Link to="/cartao/cartao-fisico" search={{ id: c.id }}>
                              <CreditCard className="size-4" />
                            </Link>
                          </IconBtn>
                        )}
                        {can("dashboard.download_card") && (
                          <IconBtn
                            title="Baixar cartão para impressão (PDF)"
                            onClick={() => handlePrintOne(c)}
                            disabled={printingId === c.id}
                          >
                            {printingId === c.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Printer className="size-4" />
                            )}
                          </IconBtn>
                        )}
                        {can("dashboard.share") && (
                          <IconBtn title="Compartilhar com o colaborador" onClick={() => setSharing(c)}>
                            <Share2 className="size-4" />
                          </IconBtn>
                        )}
                        {can("dashboard.delete") && (
                          <IconBtn title="Excluir" danger onClick={() => setToDelete(c)}>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CollaboratorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        collaborator={editing}
        onSaved={load}
      />

      <ShareDialog collaborator={sharing} onOpenChange={(o) => !o && setSharing(null)} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O Link Tree de <strong>{toDelete?.nome}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[color:var(--error)] text-white hover:bg-[color:var(--error)]/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>

  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-[color:var(--text-muted)]">{label}</div>
      <div className="font-display text-2xl font-bold text-[color:var(--text-main)]">{value}</div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
  asChild,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  danger?: boolean;
  asChild?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      asChild={asChild}
      variant="ghost"
      size="icon"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={danger ? "text-[color:var(--error)] hover:bg-[color:var(--error)]/10 hover:text-[color:var(--error)]" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-main)]"}
    >
      {children}
    </Button>
  );
}
