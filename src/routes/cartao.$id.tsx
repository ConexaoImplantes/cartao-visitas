import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTheme, type Collaborator, type ThemeConfig } from "@/lib/types";
import { LinkTreeCard } from "@/components/link-tree-card";

export const Route = createFileRoute("/cartao/$id")({
  ssr: false,
  component: PublicCardPage,
  notFoundComponent: () => (
    <Centered title="Cartão não encontrado" message="Verifique o link com quem o compartilhou." />
  ),
  errorComponent: () => (
    <Centered title="Não foi possível abrir o cartão" message="Tente novamente em instantes." />
  ),
});

function PublicCardPage() {
  const { id } = Route.useParams();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; c: Collaborator; theme: ThemeConfig }
    | { kind: "inactive" }
    | { kind: "missing" }
  >({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: cData }, { data: tData }] = await Promise.all([
        supabase.from("collaborators").select("*").eq("id", id).maybeSingle(),
        supabase.from("theme_config").select("config").eq("id", "global").maybeSingle(),
      ]);
      if (!alive) return;
      const theme: ThemeConfig = normalizeTheme(tData?.config);
      if (!cData) {
        // Could be missing OR inactive (anon RLS hides inactive). Treat as missing/inactive.
        // Try again as a generic select to distinguish — anon won't return inactive.
        setState({ kind: "missing" });
        return;
      }
      if ((cData as Collaborator).status !== "ativo") {
        setState({ kind: "inactive" });
        return;
      }
      setState({ kind: "ready", c: cData as Collaborator, theme });
      const empresa = theme.institucional.nomeEmpresa?.trim();
      const consultor = (cData as Collaborator).nome?.trim();
      if (typeof document !== "undefined") {
        document.title = [empresa, consultor].filter(Boolean).join(" | ") || "Link Tree";
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.kind === "loading") {
    return (
      <Centered>
        <Loader2 className="size-6 animate-spin text-[color:var(--accent)]" />
      </Centered>
    );
  }
  if (state.kind === "missing") {
    throw notFound();
  }
  if (state.kind === "inactive") {
    return <Centered title="Cartão indisponível" message="Este Link Tree está temporariamente inativo." />;
  }
  return <LinkTreeCard collaborator={state.c} theme={state.theme} />;
}

function Centered({
  title,
  message,
  children,
}: {
  title?: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {children}
      {title && <h1 className="mt-4 font-display text-xl text-[color:var(--text-main)]">{title}</h1>}
      {message && <p className="mt-2 text-sm text-[color:var(--text-muted)]">{message}</p>}
    </div>
  );
}
