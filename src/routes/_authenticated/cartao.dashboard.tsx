import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Share2,
  CreditCard,
  Mail,
  UserRound,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { decodeTelefone, formatPhoneDisplay, maskNumberOnly } from "@/lib/types";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import type { Collaborator } from "@/lib/types";
import { CollaboratorModal } from "@/components/collaborator-modal";
import { ShareDialog } from "@/components/share-dialog";

import { fetchCardStats, type CardStats } from "@/lib/analytics";

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");
  const [sort, setSort] = useState<"recentes" | "az" | "za">("recentes");

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const normalizedQuery = removeAccents(query.trim().toLowerCase());
    const list = rows.filter((r) => {
      if (statusFilter !== "todos" && r.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return removeAccents(r.nome).toLowerCase().includes(normalizedQuery);
    });
    if (sort === "az") {
      list.sort((a, b) => removeAccents(a.nome).localeCompare(removeAccents(b.nome), "pt-BR", { sensitivity: "base" }));
    } else if (sort === "za") {
      list.sort((a, b) => removeAccents(b.nome).localeCompare(removeAccents(a.nome), "pt-BR", { sensitivity: "base" }));
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [rows, query, statusFilter, sort]);

  const hasActiveFilters = query.trim() !== "" || statusFilter !== "todos" || sort !== "recentes";

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
              <thead className="hidden text-left text-[10px] uppercase tracking-wide text-[color:var(--text-muted)] md:table-header-group">
                <tr className="border-b border-[color:var(--border-strong)]">
                  <th className="p-2 md:p-3">Colaborador</th>
                  <th className="p-2 md:p-3">Contato</th>
                  <th className="p-2 md:p-3">Métricas</th>
                  <th className="p-2 md:p-3">Status</th>
                  <th className="p-2 text-right md:p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {rows.map((c) => {
                  const tel = decodeTelefone(c.telefone_fixo);
                  const telLabel =
                    tel.kind === "ramal"
                      ? `Ramal ${maskNumberOnly(tel.ramal) || tel.ramal}`
                      : formatPhoneDisplay(c.telefone_fixo);
                  const phoneDisplay = telLabel || formatPhoneDisplay(c.whatsapp) || "—";
                  return (
                  <tr
                    key={c.id}
                    className="mb-3 block rounded-xl border border-[color:var(--border-strong)] p-3 last:mb-0 hover:bg-[color:var(--surface-hover)]/50 md:mb-0 md:table-row md:border-b md:border-[color:var(--border-strong)] md:p-0 md:last:border-0"
                  >
                    <td className="block p-2 md:table-cell md:p-3" data-label="Colaborador">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[color:var(--surface-hover)]">
                          {c.foto_url ? (
                            <img src={c.foto_url} alt={c.nome} className="size-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold">{c.nome.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-2 text-[13px] font-medium leading-snug text-[color:var(--text-main)]">
                            {c.nome}
                          </div>
                          <div className="line-clamp-1 text-[11px] text-[color:var(--text-muted)]">
                            {c.cargo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="block p-2 md:table-cell md:p-3" data-label="Contato">
                      <div className="min-w-0">
                        <div className="line-clamp-2 break-all text-[11px] text-[color:var(--text-main)]">
                          {c.email}
                        </div>
                        <div className="line-clamp-1 text-[11px] text-[color:var(--text-muted)]">
                          {phoneDisplay}
                        </div>
                      </div>
                    </td>
                    <td className="block p-2 text-[11px] text-[color:var(--text-muted)] md:table-cell md:whitespace-nowrap md:p-3" data-label="Métricas">
                      <span className="font-semibold text-[color:var(--text-main)]">
                        {Number(stats[c.id]?.views ?? 0)}
                      </span>{" "}
                      visitas ·{" "}
                      <span className="font-semibold text-[color:var(--text-main)]">
                        {Number(stats[c.id]?.clicks ?? 0)}
                      </span>{" "}
                      cliques
                    </td>
                    <td className="block p-2 md:table-cell md:p-3" data-label="Status">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={c.status === "ativo"}
                          onCheckedChange={() => toggleStatus(c)}
                          disabled={!can("dashboard.toggle_status")}
                        />
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: c.status === "ativo" ? "var(--success)20" : "var(--warning)20",
                            color: c.status === "ativo" ? "var(--success)" : "var(--warning)",
                          }}
                        >
                          {c.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </td>
                    <td className="block p-2 text-right md:table-cell md:p-3" data-label="Ações">
                      <ActionsMenu
                        c={c}
                        can={can}
                        onEdit={() => {
                          setEditing(c);
                          setModalOpen(true);
                        }}
                        onShare={() => setSharing(c)}
                        onDelete={() => setToDelete(c)}
                      />
                    </td>
                  </tr>
                );})}
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

function ActionsMenu({
  c,
  can,
  onEdit,
  onShare,
  onDelete,
}: {
  c: Collaborator;
  can: (permission: PermissionKey) => boolean;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-[color:var(--text-muted)] hover:text-[color:var(--text-main)]"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEdit(); }}>
          <Pencil className="size-4" /> Editar
        </DropdownMenuItem>
        {can("fluxo.view") && (
          <DropdownMenuItem asChild>
            <Link to="/cartao/fluxo">
              <ListChecks className="size-4" /> Fluxo / Kit
            </Link>
          </DropdownMenuItem>
        )}
        {can("foto_perfil.view") && (
          <DropdownMenuItem asChild>
            <Link to="/cartao/foto-perfil" search={{ id: c.id }}>
              <UserRound className="size-4" /> Foto de perfil
            </Link>
          </DropdownMenuItem>
        )}
        {can("dashboard.view") && (
          <>
            <DropdownMenuItem asChild>
              <Link to="/cartao/assinatura" search={{ id: c.id }}>
                <Mail className="size-4" /> Assinatura
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/cartao/cartao-fisico" search={{ id: c.id }}>
                <CreditCard className="size-4" /> Cartão físico
              </Link>
            </DropdownMenuItem>
          </>
        )}
        {can("dashboard.share") && (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onShare(); }}>
            <Share2 className="size-4" /> Compartilhar
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        {can("dashboard.delete") && (
          <DropdownMenuItem
            onSelect={(e) => { e.preventDefault(); onDelete(); }}
            className="text-[color:var(--error)] focus:bg-[color:var(--error)]/10 focus:text-[color:var(--error)]"
          >
            <Trash2 className="size-4" /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
