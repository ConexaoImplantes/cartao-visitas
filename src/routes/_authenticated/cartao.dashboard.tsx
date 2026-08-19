import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ExternalLink, Pencil, QrCode, Trash2, Loader2, Download, Share2, Printer } from "lucide-react";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import type { Collaborator } from "@/lib/types";
import { CollaboratorModal } from "@/components/collaborator-modal";
import { ShareDialog } from "@/components/share-dialog";
import { downloadQrPng, buildCardUrl, generateQrDataUrl } from "@/lib/qr";
import { fetchCardStats, type CardStats } from "@/lib/analytics";
import { Checkbox } from "@/components/ui/checkbox";
import {
  downloadPrintCard,
  downloadPrintCardsBatch,
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
  const [qrView, setQrView] = useState<{ c: Collaborator; dataUrl: string | null } | null>(null);
  const [sharing, setSharing] = useState<Collaborator | null>(null);
  const [period, setPeriod] = useState<number | null>(30);
  const [stats, setStats] = useState<Record<string, CardStats>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  async function printOptions(): Promise<PrintBackgrounds> {
    try {
      return await loadPrintOptions();
    } catch {
      return {};
    }
  }

  async function handlePrintOne(c: Collaborator) {
    setPrinting(true);
    try {
      await downloadPrintCard(c, await printOptions());
      toast.success("Cartão gerado para impressão");
    } catch (e: any) {
      toast.error("Falha ao gerar o cartão", { description: e?.message });
    } finally {
      setPrinting(false);
    }
  }

  async function handlePrintBatch() {
    const items = (rows ?? []).filter((r) => selected.has(r.id));
    if (!items.length) return;
    setPrinting(true);
    try {
      await downloadPrintCardsBatch(items, await printOptions());
      toast.success(`${items.length} cartões gerados para impressão`);
    } catch (e: any) {
      toast.error("Falha ao gerar os cartões", { description: e?.message });
    } finally {
      setPrinting(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!permLoading && !can("dashboard.view")) {
      toast.error("Você não tem permissão para acessar o Dashboard");
      navigate({ to: "/cartao/tema", replace: true });
    }
  }, [permLoading, can, navigate]);

  async function openQrView(c: Collaborator) {
    setQrView({ c, dataUrl: null });
    try {
      const dataUrl = await generateQrDataUrl(c.slug);
      setQrView({ c, dataUrl });
    } catch {
      toast.error("Falha ao gerar QR Code");
      setQrView(null);
    }
  }


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
        {can("dashboard.download_card") && selected.size > 0 && (
          <Button variant="outline" onClick={handlePrintBatch} disabled={printing}>
            {printing ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
            <span className="hidden sm:inline">Baixar {selected.size} cartões</span>
            <span className="sm:hidden">{selected.size}</span>
          </Button>
        )}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <tr className="border-b border-[color:var(--border-strong)]">
                  {can("dashboard.download_card") && (
                    <th className="w-10 p-4">
                      <Checkbox
                        checked={!!rows.length && selected.size === rows.length}
                        onCheckedChange={(v) =>
                          setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())
                        }
                        aria-label="Selecionar todos"
                      />
                    </th>
                  )}
                  <th className="p-4">Colaborador</th>
                  <th className="hidden p-4 md:table-cell">Cargo</th>
                  <th className="hidden p-4 lg:table-cell">E-mail</th>
                  <th className="p-4">Métricas</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-[color:var(--border-strong)] last:border-0 hover:bg-[color:var(--surface-hover)]/50">
                    {can("dashboard.download_card") && (
                      <td className="p-4">
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggleSelected(c.id)}
                          aria-label={`Selecionar ${c.nome}`}
                        />
                      </td>
                    )}
                    <td className="p-4">
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
                        </div>
                      </div>
                    </td>
                    <td className="hidden p-4 text-[color:var(--text-muted)] md:table-cell">{c.cargo}</td>
                    <td className="hidden p-4 text-[color:var(--text-muted)] lg:table-cell">{c.email}</td>
                    <td className="whitespace-nowrap p-4 text-xs text-[color:var(--text-muted)]">
                      <span className="font-semibold text-[color:var(--text-main)]">
                        {Number(stats[c.id]?.views ?? 0)}
                      </span>{" "}
                      visitas ·{" "}
                      <span className="font-semibold text-[color:var(--text-main)]">
                        {Number(stats[c.id]?.clicks ?? 0)}
                      </span>{" "}
                      cliques
                    </td>
                    <td className="p-4">
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
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        {can("dashboard.view_link") && (
                          <IconBtn title="Visualizar Link Tree" asChild>
                            <a href={buildCardUrl(c.slug)} target="_blank" rel="noreferrer">
                              <ExternalLink className="size-4" />
                            </a>
                          </IconBtn>
                        )}
                        {can("dashboard.edit") && (
                          <IconBtn title="Editar" onClick={() => { setEditing(c); setModalOpen(true); }}>
                            <Pencil className="size-4" />
                          </IconBtn>
                        )}
                        {can("dashboard.view_qr") && (
                          <IconBtn title="Visualizar QR Code" onClick={() => openQrView(c)}>
                            <QrCode className="size-4" />
                          </IconBtn>
                        )}
                        {can("dashboard.download_qr") && (
                          <IconBtn title="Baixar QR Code" onClick={() => downloadQrPng(c.slug, c.nome)}>
                            <Download className="size-4" />
                          </IconBtn>
                        )}
                        {can("dashboard.download_card") && (
                          <IconBtn
                            title="Baixar cartão para impressão (PDF)"
                            onClick={() => handlePrintOne(c)}
                          >
                            <Printer className="size-4" />
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

      <Dialog open={!!qrView} onOpenChange={(o) => !o && setQrView(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code — {qrView?.c.nome}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrView?.dataUrl ? (
              <img src={qrView.dataUrl} alt={`QR Code ${qrView.c.nome}`} className="size-64 rounded-lg bg-white p-3" />
            ) : (
              <div className="flex size-64 items-center justify-center rounded-lg bg-[color:var(--surface-hover)]">
                <Loader2 className="size-6 animate-spin text-[color:var(--text-muted)]" />
              </div>
            )}
            <p className="break-all text-center text-xs text-[color:var(--text-muted)]">
              {qrView && buildCardUrl(qrView.c.slug)}
            </p>
            <Button
              variant="outline"
              onClick={() => qrView && downloadQrPng(qrView.c.slug, qrView.c.nome)}
              disabled={!qrView?.dataUrl}
            >
              <Download className="size-4" /> Baixar PNG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title: string;
  danger?: boolean;
  asChild?: boolean;
}) {
  return (
    <Button
      asChild={asChild}
      variant="ghost"
      size="icon"
      title={title}
      onClick={onClick}
      className={danger ? "text-[color:var(--error)] hover:bg-[color:var(--error)]/10 hover:text-[color:var(--error)]" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-main)]"}
    >
      {children}
    </Button>
  );
}
