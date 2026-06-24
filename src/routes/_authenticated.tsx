import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, LayoutDashboard, Palette, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/logo-conexao.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const { loading, session, user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </div>
    );
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const nav = [
    { to: "/cartao/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/cartao/tema", label: "Tema", icon: Palette },
    ...(isSuperAdmin
      ? ([{ to: "/cartao/usuarios", label: "Usuários", icon: Users }] as const)
      : ([] as const)),
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-[color:var(--border-strong)] bg-[color:var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
          <img src={logoUrl} alt="Conexão" className="h-8 w-auto shrink-0" />
          <nav className="flex flex-1 items-center gap-1">
            {nav.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[color:var(--surface-hover)] text-[color:var(--text-main)]"
                      : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text-main)]"
                  }`}
                >
                  <n.icon className="size-4" />
                  <span className="hidden sm:inline">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="hidden text-right text-xs md:block">
            <div className="font-medium text-[color:var(--text-main)]">{user?.email}</div>
            <div className="text-[color:var(--text-muted)]">
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
