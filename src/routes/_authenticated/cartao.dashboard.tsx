import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ExternalLink, Pencil, QrCode, Trash2, Loader2, Download, Share2 } from "lucide-react";

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

  useEffect(() => {
    if (!permLoading && !can("dashboard.view")) {
      toast.error("Você não tem permissão para acessar o Dashboard");
      navigate({ to: "/cartao/tema", replace: true });
    }
  }, [permLoading, can, navigate]);

  async function openQrView(c: Collaborator) {
    setQrView({ c, dataUrl: null });
    try {
      const dataUrl = await generateQrDataUrl(c.id);
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
      </header>

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
                  <th className="p-4">Colaborador</th>
                  <th className="hidden p-4 md:table-cell">Cargo</th>
                  <th className="hidden p-4 lg:table-cell">E-mail</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-[color:var(--border-strong)] last:border-0 hover:bg-[color:var(--surface-hover)]/50">
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
                            <a href={buildCardUrl(c.id)} target="_blank" rel="noreferrer">
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
                          <IconBtn title="Baixar QR Code" onClick={() => downloadQrPng(c.id, c.nome)}>
                            <Download className="size-4" />
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
              {qrView && buildCardUrl(qrView.c.id)}
            </p>
            <Button
              variant="outline"
              onClick={() => qrView && downloadQrPng(qrView.c.id, qrView.c.nome)}
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
