import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut, LayoutDashboard, Palette, Users, UploadCloud, Settings, Printer, Mail, UserRound, ListChecks, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoUrl from "@/assets/logo-conexao.png";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const { loading, session, user, isSuperAdmin } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    fetchSettings().catch(() => {});
  }, [session]);

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
    ...(can("dashboard.view")
      ? ([{ to: "/cartao/dashboard", label: "Dashboard", icon: LayoutDashboard }] as const)
      : ([] as const)),
    ...(can("cartao_fisico.view")
      ? ([{ to: "/cartao/cartao-fisico", label: "Cartão", icon: Printer }] as const)
      : ([] as const)),
    ...(can("assinatura.view")
      ? ([{ to: "/cartao/assinatura", label: "Assinatura", icon: Mail }] as const)
      : ([] as const)),
    ...(can("foto_perfil.view")
      ? ([{ to: "/cartao/foto-perfil", label: "Perfil", icon: UserRound }] as const)
      : ([] as const)),
    ...(can("fluxo.view")
      ? ([{ to: "/cartao/fluxo", label: "Fluxo", icon: ListChecks }] as const)
      : ([] as const)),
    ...(can("importar.view")
      ? ([{ to: "/cartao/importar", label: "Importar", icon: UploadCloud }] as const)
      : ([] as const)),
    ...(can("tema.view")
      ? ([{ to: "/cartao/tema", label: "Tema", icon: Palette }] as const)
      : ([] as const)),
    ...(isSuperAdmin
      ? ([
          { to: "/cartao/usuarios", label: "Usuários", icon: Users },
          { to: "/cartao/configuracoes", label: "Config", icon: Settings },
        ] as const)
      : ([] as const)),
  ] as const;


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-[color:var(--border-strong)] bg-[color:var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex w-full items-center gap-4 px-4 py-3 sm:px-6 lg:gap-6">
          <img src={logoUrl} alt="Conexão" className="h-8 w-auto shrink-0" />
          <nav className="flex flex-1 flex-nowrap items-center gap-0.5 overflow-hidden md:gap-1">
            {nav.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  title={n.label}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors md:gap-2 md:px-3 ${
                    active
                      ? "bg-[color:var(--surface-hover)] text-[color:var(--text-main)]"
                      : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text-main)]"
                  }`}
                >
                  <n.icon className="size-4" />
                  <span className="hidden whitespace-nowrap xl:inline">{n.label}</span>
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
