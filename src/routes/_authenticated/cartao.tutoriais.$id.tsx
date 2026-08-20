import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/use-permissions";
import { getTutorial, readCompleted, writeCompleted } from "@/lib/tutorials";

export const Route = createFileRoute("/_authenticated/cartao/tutoriais/$id")({
  component: TutorialDetalhe,
});

function TutorialDetalhe() {
  const { id } = useParams({ from: "/_authenticated/cartao/tutoriais/$id" });
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();

  const tutorial = useMemo(() => getTutorial(id), [id]);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setDone(readCompleted());
  }, []);

  useEffect(() => {
    setStep(0);
  }, [id]);

  useEffect(() => {
    if (!permLoading && !can("tutoriais.view")) {
      navigate({ to: "/cartao/dashboard", replace: true });
    }
  }, [permLoading, can, navigate]);

  if (permLoading) {
    return <div className="text-sm text-[color:var(--text-muted)]">Carregando...</div>;
  }

  if (!tutorial) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[color:var(--text-muted)]">Tutorial não encontrado.</p>
        <Button asChild variant="outline">
          <Link to="/cartao/tutoriais">Voltar à biblioteca</Link>
        </Button>
      </div>
    );
  }

  const isDone = done.includes(tutorial.id);
  const current = tutorial.passos[step];
  const last = step === tutorial.passos.length - 1;

  const toggleDone = () => {
    const next = isDone ? done.filter((d) => d !== tutorial.id) : [...done, tutorial.id];
    setDone(next);
    writeCompleted(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/cartao/tutoriais">
            <ArrowLeft className="size-4" />
            Biblioteca
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={tutorial.rota as "/cartao/dashboard"}>
              <ExternalLink className="size-4" />
              Abrir a tela
            </Link>
          </Button>
          <Button variant={isDone ? "default" : "outline"} size="sm" onClick={toggleDone}>
            {isDone ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
            {isDone ? "Concluído" : "Marcar como concluído"}
          </Button>
        </div>
      </div>

      <header className="space-y-2">
        <Badge variant="outline">{tutorial.area}</Badge>
        <h1 className="text-2xl font-semibold text-[color:var(--text-main)]">{tutorial.titulo}</h1>
        <p className="text-sm text-[color:var(--text-muted)]">{tutorial.descricao}</p>
      </header>

      {tutorial.video && (
        <video
          src={tutorial.video}
          controls
          playsInline
          className="w-full rounded-lg border border-[color:var(--border-strong)]"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <ol className="space-y-1">
          {tutorial.passos.map((p, i) => (
            <li key={p.titulo}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors ${
                  i === step
                    ? "border-[color:var(--accent)] bg-[color:var(--surface-hover)]"
                    : "border-[color:var(--border-strong)] hover:bg-[color:var(--surface-hover)]"
                }`}
              >
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-semibold text-[color:var(--text-inverted)]">
                  {i + 1}
                </span>
                <span className="text-[color:var(--text-main)]">{p.titulo}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="space-y-4">
          {current?.imagem ? (
            <img
              src={current.imagem}
              alt={current.titulo}
              className="w-full rounded-lg border border-[color:var(--border-strong)]"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-[color:var(--border-strong)] text-sm text-[color:var(--text-muted)]">
              Captura de tela indisponível para este passo.
            </div>
          )}

          <div className="rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-4">
            <h2 className="text-base font-semibold text-[color:var(--text-main)]">
              {step + 1}. {current?.titulo}
            </h2>
            <p className="mt-1 text-sm text-[color:var(--text-muted)]">{current?.texto}</p>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ArrowLeft className="size-4" />
              Anterior
            </Button>
            <span className="text-xs text-[color:var(--text-muted)]">
              Passo {step + 1} de {tutorial.passos.length}
            </span>
            {last ? (
              <Button size="sm" onClick={toggleDone} disabled={isDone}>
                <CheckCircle2 className="size-4" />
                Concluir
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Próximo
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
