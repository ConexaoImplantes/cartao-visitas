import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "super_admin" | "admin";

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  roles: Role[];
  isSuperAdmin: boolean;
  isAdminOrSuper: boolean;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  user: null,
  roles: [],
  isSuperAdmin: false,
  isAdminOrSuper: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setRoles([]);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let mounted = true;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (!mounted) return;
        setRoles((data ?? []).map((r) => r.role as Role));
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const value = useMemo<AuthState>(() => {
    const isSuperAdmin = roles.includes("super_admin");
    const isAdminOrSuper = isSuperAdmin || roles.includes("admin");
    return {
      loading,
      session,
      user: session?.user ?? null,
      roles,
      isSuperAdmin,
      isAdminOrSuper,
    };
  }, [loading, session, roles]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
