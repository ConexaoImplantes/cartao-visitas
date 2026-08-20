import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock, PlayCircle, Search, RotateCcw } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePermissions } from "@/hooks/use-permissions";
import {
  TUTORIALS,
  TUTORIAL_AREAS,
  estimatedMinutes,
  readCompleted,
  type Tutorial,
} from "@/lib/tutorials";

export const Route = createFileRoute("/_authenticated/cartao/tutoriais/")({
  component: TutoriaisIndex,
});

function TutoriaisIndex() {
  const { can, loading: permLoading, isSuperAdmin } = usePermissions();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setDone(readCompleted());
  }, []);

  useEffect(() => {
    if (!permLoading && !can("tutoriais.view")) {
      navigate({ to: "/cartao/dashboard", replace: true });
    }
  }, [permLoading, can, navigate]);

  const visible = useMemo(
    () =>
      TUTORIALS.filter((t) => {
        if (t.soSuperAdmin && !isSuperAdmin) return false;
        if (t.permissao && !can(t.permissao)) return false;
        return true;
      }),
    [can, isSuperAdmin],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible.filter((t) => {
      if (area && t.area !== area) return false;
      if (!q) return true;
      return `${t.titulo} ${t.descricao} ${t.area}`.toLowerCase().includes(q);
    });
  }, [visible, query, area]);

  const areas = useMemo(
    () => TUTORIAL_AREAS.filter((a) => visible.some((t) => t.area === a)),
    [visible],
  );

  const completedCount = visible.filter((t) => done.includes(t.id)).length;
  const progress = visible.length ? Math.round((completedCount / visible.length) * 100) : 0;

  if (permLoading) {
    return <div className="text-sm text-[color:var(--text-muted)]">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-[color:var(--text-main)]">
          <BookOpen className="size-6 text-[color:var(--gold)]" />
          Tutoriais de uso
        </h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          Passo a passo ilustrado de cada área da plataforma. Marque como concluído para acompanhar
          seu progresso.
        </p>
      </header>

      <div className="rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[color:var(--text-muted)]">
            {completedCount} de {visible.length} tutoriais concluídos
          </span>
          <span className="font-medium text-[color:var(--text-main)]">{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tutorial..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={area === null ? "default" : "outline"}
            onClick={() => setArea(null)}
          >
            Todos
          </Button>
          {areas.map((a) => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant={area === a ? "default" : "outline"}
              onClick={() => setArea(a)}
            >
              {a}
            </Button>
          ))}
          {(query || area) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuery("");
                setArea(null);
              }}
            >
              <RotateCcw className="size-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">Nenhum tutorial encontrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TutorialCard key={t.id} tutorial={t} done={done.includes(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TutorialCard({ tutorial, done }: { tutorial: Tutorial; done: boolean }) {
  return (
    <Link
      to="/cartao/tutoriais/$id"
      params={{ id: tutorial.id }}
      className="group flex flex-col overflow-hidden rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] transition-colors hover:border-[color:var(--gold)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[color:var(--surface-hover)]">
        {tutorial.capa ? (
          <img
            src={tutorial.capa}
            alt={tutorial.titulo}
            className="size-full object-cover object-top transition-transform group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[color:var(--text-muted)]">
            <PlayCircle className="size-10" />
          </div>
        )}
        {done && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[color:var(--surface)]/90 px-2 py-1 text-xs font-medium text-[color:var(--gold)]">
            <CheckCircle2 className="size-3.5" />
            Concluído
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{tutorial.area}</Badge>
          {tutorial.video && <Badge variant="secondary">Vídeo</Badge>}
        </div>
        <h2 className="text-base font-semibold text-[color:var(--text-main)]">{tutorial.titulo}</h2>
        <p className="line-clamp-2 text-sm text-[color:var(--text-muted)]">{tutorial.descricao}</p>
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-[color:var(--text-muted)]">
          <span>{tutorial.passos.length} passos</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />~{estimatedMinutes(tutorial)} min
          </span>
        </div>
      </div>
    </Link>
  );
}
