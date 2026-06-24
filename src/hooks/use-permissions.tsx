import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { PermissionKey } from "@/lib/permissions";

export function usePermissions() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase
      .from("user_permissions")
      .select("permission")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!mounted) return;
        setPermissions(new Set((data ?? []).map((r: any) => r.permission as PermissionKey)));
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user?.id, authLoading]);

  function can(key: PermissionKey): boolean {
    if (isSuperAdmin) return true;
    return permissions.has(key);
  }

  return { can, loading: loading || authLoading, isSuperAdmin };
}
