import { useEffect } from "react";
import { Download, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ArtViewerState {
  open: boolean;
  title: string;
  description?: string;
  /** Object URL do PDF ou da imagem gerada. */
  url: string | null;
  kind: "pdf" | "image";
  filename?: string;
  loading?: boolean;
}

/**
 * Visualização das artes (cartão, assinatura e foto de perfil) sempre dentro
 * da plataforma — nunca em nova aba ou rota externa.
 */
export function ArtViewerDialog({
  state,
  onOpenChange,
}: {
  state: ArtViewerState;
  onOpenChange: (open: boolean) => void;
}) {
  // Libera o object URL quando o modal fecha ou a arte muda.
  useEffect(() => {
    const url = state.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.url]);

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(96vw,1100px)] max-w-none overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b border-[color:var(--border-strong)] p-5 pb-4">
          <DialogTitle>{state.title}</DialogTitle>
          <DialogDescription>
            {state.description ?? "Conferência da arte em tamanho real, dentro da plataforma."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] min-h-[320px] place-items-center overflow-auto bg-[color:var(--surface-hover)] p-4">
          {state.loading || !state.url ? (
            <div className="flex items-center gap-2 py-16 text-sm text-[color:var(--text-muted)]">
              <Loader2 className="size-4 animate-spin" /> Gerando arte...
            </div>
          ) : state.kind === "pdf" ? (
            <iframe
              src={state.url}
              title={state.title}
              className="h-[70vh] w-full rounded-lg border border-[color:var(--border-strong)] bg-white"
            />
          ) : (
            <img
              src={state.url}
              alt={state.title}
              className="max-h-[68vh] w-auto max-w-full rounded-lg border border-[color:var(--border-strong)] object-contain"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--border-strong)] p-4">
          {state.url && (
            <Button asChild variant="outline">
              <a href={state.url} download={state.filename ?? "arte"}>
                <Download className="size-4" />
                Baixar
              </a>
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const EMPTY_ART_VIEWER: ArtViewerState = {
  open: false,
  title: "",
  url: null,
  kind: "image",
};
