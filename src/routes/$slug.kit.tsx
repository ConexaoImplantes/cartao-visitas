import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  Package,
  QrCode as QrCodeIcon,
  Mail,
  UserRound,
  CreditCard,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTheme, type Collaborator, type ThemeConfig } from "@/lib/types";
import { ArtViewerDialog, EMPTY_ART_VIEWER, type ArtViewerState } from "@/components/art-viewer-dialog";
import { buildCardUrl, buildKitUrl, generateQrDataUrl, downloadQrPng } from "@/lib/qr";
import { trackKitView } from "@/lib/analytics";
import { profilePhotoBlob, normalizeFrame } from "@/lib/profile-photo";
import { renderSignaturePng } from "@/lib/email-signature";
import { buildPrintCardsPdf } from "@/lib/print-card";
import { buildGuidePdf } from "@/lib/kit-guide";
import { downloadKitZip, kitBaseName, kitStatus, type KitOptions } from "@/lib/kit";
import logoUrl from "@/assets/logo-conexao.png";

export const Route = createFileRoute("/$slug/kit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Meu kit digital | Conexão Implantes" },
      {
        name: "description",
        content:
          "Baixe sua foto de perfil, assinatura de e-mail, cartão de visitas e o Link Tree corporativo.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Meu kit digital — Conexão Implantes" },
      {
        property: "og:description",
        content: "Materiais oficiais do colaborador prontos para download.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KitPage,
});

type State =
  | { kind: "loading" }
  | { kind: "ready"; c: Collaborator; theme: ThemeConfig }
  | { kind: "inactive" }
  | { kind: "missing" };

function themeToKitOptions(theme: ThemeConfig): KitOptions {
  return {
    print: {
      modelo: theme.impressao.modelo,
      frenteUrl: theme.impressao.frenteUrl || undefined,
      versoUrl: theme.impressao.versoUrl || undefined,
      antigoFrenteUrl: theme.impressao.antigoFrenteUrl || undefined,
      antigoVersoUrl: theme.impressao.antigoVersoUrl || undefined,
      site: theme.institucional.site || undefined,
      marcaTop: theme.impressao.marcaTop,
      marcaLogoAltura: theme.impressao.marcaLogoAltura,
    },
    signature: { bgUrl: theme.assinatura.bgUrl || undefined },
    profileBgUrl: theme.fotoPerfil.bgUrl || undefined,
  };
}

function KitPage() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewer, setViewer] = useState<ArtViewerState>(EMPTY_ART_VIEWER);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: cData }, { data: tData }] = await Promise.all([
        supabase.from("collaborators").select("*").eq("slug", slug).maybeSingle(),
        supabase.from("theme_config").select("config").eq("id", "global").maybeSingle(),
      ]);
      if (!alive) return;
      const theme = normalizeTheme(tData?.config);
      if (!cData) {
        setState({ kind: "missing" });
        return;
      }
      const c = cData as Collaborator;
      if (c.status !== "ativo") {
        setState({ kind: "inactive" });
        return;
      }
      setState({ kind: "ready", c, theme });
      void trackKitView(c.id, slug);
      generateQrDataUrl(slug)
        .then((d) => alive && setQr(d))
        .catch(() => {});
      if (typeof document !== "undefined") {
        document.title = `Kit digital | ${c.nome}`;
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state.kind === "loading") {
    return (
      <Centered>
        <Loader2 className="size-5 animate-spin" />
      </Centered>
    );
  }

  if (state.kind !== "ready") {
    return (
      <Centered>
        <div className="max-w-md space-y-2 text-center">
          <img src={logoUrl} alt="Conexão" className="mx-auto mb-4 h-8 w-auto" />
          <h1 className="font-display text-2xl font-bold text-[color:var(--text-main)]">
            Kit indisponível
          </h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Este endereço não está disponível no momento. Confira o link com o seu gestor.
          </p>
        </div>
      </Centered>
    );
  }

  const { c, theme } = state;
  const opts = themeToKitOptions(theme);
  const status = kitStatus(c, opts);
  const linkUrl = buildCardUrl(c.slug);
  const kitUrl = buildKitUrl(c.slug);
  const base = kitBaseName(c);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  function openViewer(title: string, description: string, kind: "pdf" | "image", filename: string) {
    setViewer({ open: true, title, description, kind, filename, url: null, loading: true });
  }

  function showBlob(blob: Blob) {
    setViewer((v) => ({ ...v, url: URL.createObjectURL(blob), loading: false }));
  }

  function fail(e: any) {
    setViewer(EMPTY_ART_VIEWER);
    toast.error("Não foi possível gerar o material", { description: e?.message });
  }

  async function photoBlob() {
    const linktreeOnly = !c.foto_recortada_url && !!c.foto_url;
    const saved = normalizeFrame(c.foto_perfil_ajuste);
    return profilePhotoBlob({
      personUrl: c.foto_recortada_url ?? c.foto_url,
      bgUrl: opts.profileBgUrl || null,
      frame: linktreeOnly ? { ...saved, mode: "estatico" } : saved,
    });
  }


  async function signatureBlob() {
    return renderSignaturePng(
      {
        nome: c.nome,
        nome_cartao: c.nome_cartao,
        cargo: c.cargo,
        email: c.email,
        whatsapp: c.whatsapp,
        slug: c.slug,
      },
      opts.signature,
    );
  }

  async function cardBlob() {
    const bytes = await buildPrintCardsPdf(
      [
        {
          nome: c.nome,
          nome_cartao: c.nome_cartao,
          cargo: c.cargo,
          slug: c.slug,
          whatsapp: c.whatsapp,
          email: c.email,
        },
      ],
      opts.print,
    );
    return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  }

  async function guideBlob() {
    const bytes = await buildGuidePdf({
      nome: c.nome,
      cargo: c.cargo,
      email: c.email,
      slug: c.slug,
      modelo: opts.print.modelo,
      kitUrl,
    });
    return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e: any) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function view(
    key: string,
    title: string,
    description: string,
    kind: "pdf" | "image",
    filename: string,
    maker: () => Promise<Blob>,
  ) {
    openViewer(title, description, kind, filename);
    await run(key, async () => showBlob(await maker()));
  }

  async function download(key: string, filename: string, maker: () => Promise<Blob>) {
    await run(key, async () => {
      saveBlob(await maker(), filename);
      toast.success("Download iniciado");
    });
  }

  async function handleZip() {
    setBusy("zip");
    try {
      await downloadKitZip(c, opts, setProgress);
      toast.success("Kit completo baixado");
    } catch (e: any) {
      toast.error("Falha ao gerar o kit", { description: e?.message });
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-[color:var(--border-strong)] bg-[color:var(--surface)]">
        <div className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-start">
            <img src={logoUrl} alt="Conexão Implantes" className="h-6 w-auto" />
          </div>
          <div className="min-w-0 max-w-full text-center">
            <h1 className="truncate font-display text-xl font-bold text-[color:var(--text-main)]">
              {c.nome}
            </h1>
            <p className="truncate text-sm text-[color:var(--text-muted)]">{c.cargo}</p>
          </div>
          <div className="flex items-center justify-end">
            <Button
              onClick={handleZip}
              disabled={busy === "zip" || !status.ready}
              className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
            >
              {busy === "zip" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Package className="size-4" />
              )}
              Baixar kit completo (ZIP)
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <p className="text-sm text-[color:var(--text-muted)]">
          Este é o seu kit digital oficial. Visualize e baixe cada material e leia o manual de regras
          e bom uso antes de aplicar as artes.
        </p>

        {progress && (
          <div className="rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 py-2 text-xs text-[color:var(--text-muted)]">
            {progress}
          </div>
        )}

        {/* Link Tree */}
        <Card
          icon={<Link2 className="size-5" />}
          title="Link Tree corporativo"
          description="Seu cartão de visitas digital, com todos os contatos sempre atualizados."
          ready={status.steps.linktree.done}
        >
          <div className="flex flex-wrap items-center gap-4">
            {qr ? (
              <img
                src={qr}
                alt={`QR Code de ${c.nome}`}
                className="size-32 rounded-lg bg-white p-2"
              />
            ) : (
              <div className="grid size-32 place-items-center rounded-lg bg-[color:var(--surface-hover)]">
                <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-3">
              <div className="break-all rounded-lg bg-[color:var(--surface-hover)] px-3 py-2 text-xs text-[color:var(--text-main)]">
                {linkUrl}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => copy(linkUrl, "Link")}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  Copiar link
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={linkUrl} target="_blank" rel="noreferrer">
                    <Eye className="size-4" /> Abrir
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!qr}
                  onClick={() => downloadQrPng(c.slug, c.nome)}
                >
                  <QrCodeIcon className="size-4" /> Baixar QR Code
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Foto de perfil */}
        <Card
          icon={<UserRound className="size-5" />}
          title="Foto de perfil (1080x1080)"
          description="Use no WhatsApp Business, LinkedIn, Teams e Google Workspace."
          ready={status.steps.foto.done}
          pending="Sua foto ainda está em preparação pelo time de Marketing."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy === "foto-view"}
              onClick={() =>
                view(
                  "foto-view",
                  "Foto de perfil",
                  "Arte 1080x1080 px.",
                  "image",
                  `foto-perfil-${base}.png`,
                  photoBlob,
                )
              }
            >
              {busy === "foto-view" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              Visualizar
            </Button>
            <Button
              size="sm"
              disabled={busy === "foto-dl"}
              onClick={() => download("foto-dl", `foto-perfil-${base}.png`, photoBlob)}
            >
              {busy === "foto-dl" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Baixar PNG
            </Button>
          </div>
        </Card>

        {/* Assinatura */}
        <Card
          icon={<Mail className="size-5" />}
          title="Assinatura de e-mail (150x50 mm)"
          description="PNG 1772x591 px para Gmail, Outlook web e Outlook desktop."
          ready={status.steps.assinatura.done}
          pending="Sua assinatura ainda está em preparação pelo time de Marketing."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy === "ass-view"}
              onClick={() =>
                view(
                  "ass-view",
                  "Assinatura de e-mail",
                  "Arte 1772x591 px (150x50 mm a 300 dpi).",
                  "image",
                  `assinatura-email-${base}.png`,
                  signatureBlob,
                )
              }
            >
              {busy === "ass-view" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              Visualizar
            </Button>
            <Button
              size="sm"
              disabled={busy === "ass-dl"}
              onClick={() => download("ass-dl", `assinatura-email-${base}.png`, signatureBlob)}
            >
              {busy === "ass-dl" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Baixar PNG
            </Button>
          </div>
        </Card>

        {/* Cartão de visitas */}
        <Card
          icon={<CreditCard className="size-5" />}
          title="Cartão de visitas para impressão"
          description="PDF 90x48 mm com sangria e marcas de corte (frente e verso)."
          ready={status.steps.cartao.done}
          pending="Seu cartão ainda está em preparação pelo time de Marketing."
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy === "cv-view"}
              onClick={() =>
                view(
                  "cv-view",
                  "Cartão de visitas",
                  "Página 1: frente · Página 2: verso.",
                  "pdf",
                  `cartao-visitas-${base}.pdf`,
                  cardBlob,
                )
              }
            >
              {busy === "cv-view" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              Visualizar
            </Button>
            <Button
              size="sm"
              disabled={busy === "cv-dl"}
              onClick={() => download("cv-dl", `cartao-visitas-${base}.pdf`, cardBlob)}
            >
              {busy === "cv-dl" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Baixar PDF
            </Button>
          </div>
        </Card>

        {/* Manual */}
        <Card
          icon={<FileText className="size-5" />}
          title="Manual de regras e bom uso"
          description="Como aplicar cada material e o que não é permitido fazer com as artes."
          ready
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy === "man-view"}
              onClick={() =>
                view(
                  "man-view",
                  "Manual de regras e bom uso",
                  "Leia antes de aplicar os materiais.",
                  "pdf",
                  `COMO-USAR-${base}.pdf`,
                  guideBlob,
                )
              }
            >
              {busy === "man-view" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
              Ler manual
            </Button>
            <Button
              size="sm"
              disabled={busy === "man-dl"}
              onClick={() => download("man-dl", `COMO-USAR-${base}.pdf`, guideBlob)}
            >
              {busy === "man-dl" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Baixar PDF
            </Button>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
          <div>
            <div className="font-medium text-[color:var(--text-main)]">Kit completo em ZIP</div>
            <p className="text-xs text-[color:var(--text-muted)]">
              Manual + foto de perfil + assinatura + cartão de visitas + QR Code em um único arquivo.
            </p>
          </div>
          <Button
            onClick={handleZip}
            disabled={busy === "zip" || !status.ready}
            className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
          >
            {busy === "zip" ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
            Baixar kit completo
          </Button>
        </div>

        <footer className="pb-6 pt-2 text-center text-xs text-[color:var(--text-muted)]">
          Materiais oficiais Conexão Implantes. Precisa atualizar cargo, telefone ou e-mail? Fale com
          o seu gestor.
        </footer>
      </main>

      <ArtViewerDialog
        state={viewer}
        onOpenChange={(o) => !o && setViewer(EMPTY_ART_VIEWER)}
      />
    </div>
  );
}

function Card({
  icon,
  title,
  description,
  ready,
  pending,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ready: boolean;
  pending?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[color:var(--surface-hover)] text-[color:var(--accent)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-[color:var(--text-main)]">
            {title}
          </h2>
          <p className="text-sm text-[color:var(--text-muted)]">{description}</p>
          <div className="mt-4">
            {ready ? (
              children
            ) : (
              <p className="rounded-lg bg-[color:var(--surface-hover)] px-3 py-2 text-xs text-[color:var(--text-muted)]">
                {pending ?? "Material ainda em preparação pelo time de Marketing."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-[color:var(--text-muted)]">
      {children}
    </div>
  );
}
