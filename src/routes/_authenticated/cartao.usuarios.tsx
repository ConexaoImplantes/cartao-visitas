import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Pencil, KeyRound, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/use-auth";
import { PERMISSION_GROUPS, type PermissionKey } from "@/lib/permissions";
import {
  listManagedUsers,
  createManagedUser,
  updateUserPermissions,
  resetUserPassword,
  deleteManagedUser,
  type ManagedUser,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/cartao/usuarios")({
  component: UsuariosPage,
});

function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

function UsuariosPage() {
  const { isSuperAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);

  const listFn = useServerFn(listManagedUsers);

  useEffect(() => {
    if (authLoading) return;
    if (!isSuperAdmin) {
      navigate({ to: "/cartao/dashboard", replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  async function load() {
    try {
      const data = await listFn();
      setUsers(data);
    } catch (e: any) {
      toast.error("Falha ao carregar usuários", { description: e.message });
    }
  }

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="flex items-center justify-center p-12 text-[color:var(--text-muted)]">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">
            Usuários & Permissões
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Crie credenciais de acesso e defina o que cada usuário pode ver e fazer.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="shrink-0 gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo Usuário</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)]">
        {users === null ? (
          <div className="flex items-center justify-center p-12 text-[color:var(--text-muted)]">
            <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[color:var(--text-muted)]">
            Nenhum usuário ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <tr className="border-b border-[color:var(--border-strong)]">
                  <th className="p-4">E-mail</th>
                  <th className="p-4">Papel</th>
                  <th className="p-4">Permissões</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[color:var(--border-strong)] last:border-0 hover:bg-[color:var(--surface-hover)]/50"
                  >
                    <td className="p-4 font-medium text-[color:var(--text-main)]">{u.email}</td>
                    <td className="p-4 text-[color:var(--text-muted)]">
                      {u.is_super_admin ? (
                        <span className="rounded-full bg-[color:var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[color:var(--accent)]">
                          Super Admin
                        </span>
                      ) : (
                        <span className="text-xs">Usuário</span>
                      )}
                    </td>
                    <td className="p-4 text-[color:var(--text-muted)]">
                      {u.is_super_admin
                        ? "Todas (automático)"
                        : `${u.permissions.length} permissões`}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar permissões"
                          onClick={() => setEditing(u)}
                          disabled={u.is_super_admin}
                          className="text-[color:var(--text-muted)] hover:text-[color:var(--text-main)]"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Resetar senha"
                          onClick={() => setResetting(u)}
                          className="text-[color:var(--text-muted)] hover:text-[color:var(--text-main)]"
                        >
                          <KeyRound className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => setDeleting(u)}
                          disabled={u.is_super_admin || u.id === user?.id}
                          className="text-[color:var(--error)] hover:bg-[color:var(--error)]/10 hover:text-[color:var(--error)]"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />

      <EditPermissionsDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
      />

      <ResetPasswordDialog
        user={resetting}
        onClose={() => setResetting(null)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleting?.email}</strong> perderá acesso imediatamente. Ação irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  await deleteManagedUser({ data: { user_id: deleting.id } });
                  toast.success("Usuário excluído");
                  setDeleting(null);
                  load();
                } catch (e: any) {
                  toast.error("Falha ao excluir", { description: e.message });
                }
              }}
              className="bg-[color:var(--error)] text-white hover:bg-[color:var(--error)]/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Permission selector ---------------- */

function PermissionsTree({
  value,
  onChange,
}: {
  value: Set<PermissionKey>;
  onChange: (next: Set<PermissionKey>) => void;
}) {
  function toggle(k: PermissionKey) {
    const next = new Set(value);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onChange(next);
  }
  function toggleAll(keys: PermissionKey[], on: boolean) {
    const next = new Set(value);
    keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
    onChange(next);
  }
  return (
    <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
      {PERMISSION_GROUPS.map((g) => {
        const keys = g.permissions.map((p) => p.key);
        const allOn = keys.every((k) => value.has(k));
        return (
          <div key={g.route} className="rounded-lg border border-[color:var(--border-strong)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-[color:var(--text-main)]">{g.label}</div>
                <div className="text-xs text-[color:var(--text-muted)]">{g.description}</div>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs text-[color:var(--text-muted)]">
                <Checkbox checked={allOn} onCheckedChange={(v) => toggleAll(keys, !!v)} />
                Tudo
              </label>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {g.permissions.map((p) => (
                <label key={p.key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[color:var(--surface-hover)]">
                  <Checkbox checked={value.has(p.key)} onCheckedChange={() => toggle(p.key)} />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Create dialog ---------------- */

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [perms, setPerms] = useState<Set<PermissionKey>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setPerms(new Set());
      setShowPw(false);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }
    setSaving(true);
    try {
      await createManagedUser({
        data: { email, password, permissions: Array.from(perms) },
      });
      toast.success("Usuário criado");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error("Falha ao criar usuário", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie a credencial e selecione as permissões granulares.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Gerar senha"
                  onClick={() => {
                    const p = generatePassword();
                    setPassword(p);
                    setShowPw(true);
                  }}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissões</Label>
            <PermissionsTree value={perms} onChange={setPerms} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gradient-accent text-[color:var(--text-inverted)]">
              {saving && <Loader2 className="size-4 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Edit permissions dialog ---------------- */

function EditPermissionsDialog({
  user,
  onClose,
  onSaved,
}: {
  user: ManagedUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [perms, setPerms] = useState<Set<PermissionKey>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setPerms(new Set(user.permissions));
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserPermissions({
        data: { user_id: user.id, permissions: Array.from(perms) },
      });
      toast.success("Permissões atualizadas");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error("Falha ao salvar", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Permissões — {user?.email}</DialogTitle>
        </DialogHeader>
        <PermissionsTree value={perms} onChange={setPerms} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-accent text-[color:var(--text-inverted)]">
            {saving && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Reset password dialog ---------------- */

function ResetPasswordDialog({ user, onClose }: { user: ManagedUser | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setPassword("");
      setShowPw(false);
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    if (password.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }
    setSaving(true);
    try {
      await resetUserPassword({ data: { user_id: user.id, password } });
      toast.success("Senha atualizada");
      onClose();
    } catch (e: any) {
      toast.error("Falha", { description: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resetar senha</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="new-pw">Nova senha</Label>
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Input
                id="new-pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                setPassword(generatePassword());
                setShowPw(true);
              }}
              title="Gerar senha"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gradient-accent text-[color:var(--text-inverted)]">
            {saving && <Loader2 className="size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
