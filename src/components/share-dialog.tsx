import { useEffect, useState } from "react";
import { Copy, Check, Download, Loader2, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Collaborator } from "@/lib/types";
import { phoneDigits } from "@/lib/types";
import { buildCardUrl, generateQrDataUrl, downloadQrPng } from "@/lib/qr";
import { fetchCardStats, type CardStats } from "@/lib/analytics";

export function ShareDialog({
  collaborator,
  onOpenChange,
}: {
  collaborator: Collaborator | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<CardStats | null>(null);

  const url = collaborator ? buildCardUrl(collaborator.slug) : "";

  useEffect(() => {
    setQr(null);
    setCopied(false);
    setStats(null);
    if (!collaborator) return;
    let mounted = true;
    generateQrDataUrl(collaborator.slug)
      .then((d) => mounted && setQr(d))
      .catch(() => toast.error("Falha ao gerar QR Code"));
    fetchCardStats(null).then((all) => {
      if (mounted) setStats(all[collaborator.id] ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [collaborator?.slug]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  }

  function message() {
    return `Olá, ${collaborator?.nome ?? ""}! Este é o seu cartão de visitas digital (Link Tree Corporativo): ${url}`;
  }

  function shareWhatsApp() {
    const digits = phoneDigits(collaborator?.whatsapp);
    const to = digits.length >= 10 ? digits : "";
    window.open(
      `https://wa.me/${to}?text=${encodeURIComponent(message())}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function shareEmail() {
    const subject = encodeURIComponent("Seu Link Tree Corporativo e QR Code");
    const body = encodeURIComponent(
      `${message()}\n\nVocê também pode baixar o seu QR Code exclusivo acessando o link acima.`,
    );
    window.location.href = `mailto:${collaborator?.email ?? ""}?subject=${subject}&body=${body}`;
  }

  return (
    <Dialog open={!!collaborator} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar — {collaborator?.nome}</DialogTitle>
          <DialogDescription>
            Envie ao colaborador o link do Link Tree Corporativo e o QR Code exclusivo dele.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-1">
          {qr ? (
            <img src={qr} alt={`QR Code ${collaborator?.nome}`} className="size-44 rounded-lg bg-white p-3" />
          ) : (
            <div className="flex size-44 items-center justify-center rounded-lg bg-[color:var(--surface-hover)]">
              <Loader2 className="size-6 animate-spin text-[color:var(--text-muted)]" />
            </div>
          )}

          <div className="flex w-full gap-2">
            <Input readOnly value={url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" size="icon" title="Copiar link" onClick={copyLink}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={shareWhatsApp}>
              <MessageCircle className="size-4" /> WhatsApp
            </Button>
            <Button variant="outline" onClick={shareEmail}>
              <Mail className="size-4" /> E-mail
            </Button>
            <Button
              variant="outline"
              disabled={!qr}
              onClick={() => collaborator && downloadQrPng(collaborator.slug, collaborator.nome)}
            >
              <Download className="size-4" /> QR Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
