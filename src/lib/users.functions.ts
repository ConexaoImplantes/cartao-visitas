import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ALL_PERMISSIONS, isValidPermission, type PermissionKey } from "./permissions";

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error("Falha ao validar permissão");
  if (!data) throw new Error("Forbidden");
}

export interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  is_super_admin: boolean;
  permissions: PermissionKey[];
}

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersResp, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) throw new Error(usersErr.message);

    const ids = usersResp.users.map((u) => u.id);
    const [{ data: perms }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("user_permissions").select("user_id, permission").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    const permsByUser = new Map<string, PermissionKey[]>();
    (perms ?? []).forEach((p: any) => {
      if (!isValidPermission(p.permission)) return;
      const arr = permsByUser.get(p.user_id) ?? [];
      arr.push(p.permission);
      permsByUser.set(p.user_id, arr);
    });
    const superSet = new Set(
      (roles ?? []).filter((r: any) => r.role === "super_admin").map((r: any) => r.user_id),
    );

    return usersResp.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      is_super_admin: superSet.has(u.id),
      permissions: permsByUser.get(u.id) ?? [],
    }));
  });

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  permissions: z.array(z.string()),
});

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const perms = data.permissions.filter(isValidPermission);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");

    if (perms.length) {
      const rows = perms.map((p) => ({ user_id: created.user!.id, permission: p }));
      const { error: pErr } = await supabaseAdmin.from("user_permissions").insert(rows);
      if (pErr) throw new Error(pErr.message);
    }
    return { id: created.user.id };
  });

const updatePermsSchema = z.object({
  user_id: z.string().uuid(),
  permissions: z.array(z.string()),
});

export const updateUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatePermsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const perms = data.permissions.filter(isValidPermission);

    const { error: dErr } = await supabaseAdmin
      .from("user_permissions")
      .delete()
      .eq("user_id", data.user_id);
    if (dErr) throw new Error(dErr.message);

    if (perms.length) {
      const rows = perms.map((p) => ({ user_id: data.user_id, permission: p }));
      const { error: iErr } = await supabaseAdmin.from("user_permissions").insert(rows);
      if (iErr) throw new Error(iErr.message);
    }
    return { ok: true };
  });

const resetSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8),
});

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) {
      const msg = /weak|easy to guess|pwned/i.test(error.message)
        ? "Senha muito fraca ou vazada. Use uma senha mais forte (misture letras maiúsculas, minúsculas, números e símbolos)."
        : error.message;
      return { ok: false as const, error: msg };
    }
    return { ok: true as const, error: null };
  });

const deleteSchema = z.object({ user_id: z.string().uuid() });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.user_id === context.userId) throw new Error("Você não pode excluir a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if ((targetRoles ?? []).some((r: any) => r.role === "super_admin")) {
      throw new Error("Não é possível excluir um Super Admin.");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ALL_PERMISSION_KEYS = ALL_PERMISSIONS;
