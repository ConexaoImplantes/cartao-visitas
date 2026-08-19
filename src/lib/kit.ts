import type { Collaborator } from "./types";
import { normalizeTheme } from "./types";
import { buildCardUrl } from "./qr";
import { buildGuidePdf } from "./kit-guide";
import { buildPrintCardsPdf, type PrintBackgrounds } from "./print-card";
import { renderSignaturePng, type SignatureOptions } from "./email-signature";
import { normalizeFrame, profilePhotoBlob } from "./profile-photo";

export type KitStepKey = "foto" | "linktree" | "assinatura" | "cartao";

export interface KitStepDef {
  key: KitStepKey;
  order: number;
  label: string;
  description: string;
  /** Rota onde a etapa é executada. */
  route: "/cartao/foto-perfil" | "/cartao/dashboard" | "/cartao/assinatura" | "/cartao/cartao-fisico";
}

/** Passo a passo lógico da criação dos materiais do colaborador. */
export const KIT_STEPS: KitStepDef[] = [
  {
    key: "foto",
    order: 1,
    label: "Foto de perfil",
    description: "Recorte do fundo e enquadramento na arte 1080x1080.",
    route: "/cartao/foto-perfil",
  },
  {
    key: "linktree",
    order: 2,
    label: "Link Tree corporativo",
    description: "Cadastro completo, apelido do link e status ativo.",
    route: "/cartao/dashboard",
  },
  {
    key: "assinatura",
    order: 3,
    label: "Assinatura de e-mail",
    description: "Celular e e-mail necessários para a arte 150x50 mm.",
    route: "/cartao/assinatura",
  },
  {
    key: "cartao",
    order: 4,
    label: "Cartão de visitas",
    description: "Modelo escolhido e dados prontos para impressão.",
    route: "/cartao/cartao-fisico",
  },
];

export interface KitStatus {
  steps: Record<KitStepKey, { done: boolean; reason?: string }>;
  completed: number;
  ready: boolean;
}

export interface KitOptions {
  print: PrintBackgrounds;
  signature: SignatureOptions;
  profileBgUrl?: string;
}

/** Carrega, uma única vez, as artes/config globais usadas pelo kit. */
export async function loadKitOptions(): Promise<KitOptions> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase
    .from("theme_config")
    .select("config")
    .eq("id", "global")
    .maybeSingle();
  const theme = normalizeTheme(data?.config);
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

/** Estado das 4 etapas para um colaborador. */
export function kitStatus(c: Collaborator, opts?: Partial<KitOptions>): KitStatus {
  const has = (v: unknown) => typeof v === "string" && v.trim().length > 0;

  const foto = has(c.foto_recortada_url)
    ? { done: true }
    : { done: false, reason: "Envie a foto e ajuste o enquadramento." };

  const linktreeMissing: string[] = [];
  if (!has(c.nome)) linktreeMissing.push("nome");
  if (!has(c.cargo)) linktreeMissing.push("cargo");
  if (!has(c.email)) linktreeMissing.push("e-mail");
  if (!has(c.whatsapp)) linktreeMissing.push("WhatsApp");
  if (!has(c.slug)) linktreeMissing.push("apelido do link");
  const linktree =
    linktreeMissing.length === 0 && c.status === "ativo"
      ? { done: true }
      : {
          done: false,
          reason:
            linktreeMissing.length > 0
              ? `Faltam: ${linktreeMissing.join(", ")}.`
              : "Ative o colaborador para publicar o Link Tree.",
        };

  const assinatura =
    has(c.email) && has(c.whatsapp) && has(c.slug)
      ? { done: true }
      : { done: false, reason: "Preencha e-mail e celular do colaborador." };

  const modelo = opts?.print?.modelo;
  const cartao =
    modelo && has(c.slug) && has(c.cargo)
      ? { done: true }
      : {
          done: false,
          reason: modelo
            ? "Complete cargo e apelido do link."
            : "Escolha o modelo do cartão na rota Cartão.",
        };

  const steps = { foto, linktree, assinatura, cartao } as KitStatus["steps"];
  const completed = Object.values(steps).filter((s) => s.done).length;
  return { steps, completed, ready: completed === KIT_STEPS.length };
}

export function kitBaseName(c: Collaborator) {
  return (
    c.slug ||
    c.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "colaborador"
  );
}

async function qrPngBlob(slug: string): Promise<Blob> {
  const QRCode = (await import("qrcode")).default;
  const dataUrl = await QRCode.toDataURL(buildCardUrl(slug), {
    width: 1200,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

export interface KitFile {
  name: string;
  blob: Blob;
}

/** Gera todos os arquivos do kit de um colaborador. */
export async function buildKitFiles(
  c: Collaborator,
  opts: KitOptions,
  onProgress?: (label: string) => void,
): Promise<KitFile[]> {
  const base = kitBaseName(c);
  const files: KitFile[] = [];

  onProgress?.("Gerando foto de perfil...");
  if (c.foto_recortada_url) {
    const photo = await profilePhotoBlob({
      personUrl: c.foto_recortada_url,
      bgUrl: opts.profileBgUrl || null,
      frame: normalizeFrame(c.foto_perfil_ajuste),
    });
    files.push({ name: `foto-perfil-${base}.png`, blob: photo });
  }

  onProgress?.("Gerando assinatura de e-mail...");
  const signature = await renderSignaturePng(
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
  files.push({ name: `assinatura-email-${base}.png`, blob: signature });

  onProgress?.("Gerando cartão de visitas...");
  const cardBytes = await buildPrintCardsPdf(
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
  files.push({
    name: `cartao-visitas-${base}.pdf`,
    blob: new Blob([cardBytes as unknown as BlobPart], { type: "application/pdf" }),
  });

  onProgress?.("Gerando QR Code...");
  files.push({ name: `qrcode-linktree-${base}.png`, blob: await qrPngBlob(c.slug) });

  onProgress?.("Montando o manual em PDF...");
  const guideBytes = await buildGuidePdf({
    nome: c.nome,
    cargo: c.cargo,
    email: c.email,
    slug: c.slug,
    modelo: opts.print.modelo,
  });
  files.push({
    name: `COMO-USAR-${base}.pdf`,
    blob: new Blob([guideBytes as unknown as BlobPart], { type: "application/pdf" }),
  });

  return files;
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

/** Baixa o ZIP com todos os materiais de um colaborador. */
export async function downloadKitZip(
  c: Collaborator,
  opts: KitOptions,
  onProgress?: (label: string) => void,
) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const files = await buildKitFiles(c, opts, onProgress);
  for (const f of files) zip.file(f.name, f.blob);
  onProgress?.("Compactando...");
  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, `kit-${kitBaseName(c)}.zip`);
}

/** Baixa um ZIP com uma pasta por colaborador. */
export async function downloadKitZipBatch(
  items: Collaborator[],
  opts: KitOptions,
  onProgress?: (label: string) => void,
) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  let i = 0;
  for (const c of items) {
    i += 1;
    const folder = zip.folder(kitBaseName(c))!;
    const files = await buildKitFiles(c, opts, (label) =>
      onProgress?.(`(${i}/${items.length}) ${c.nome} — ${label}`),
    );
    for (const f of files) folder.file(f.name, f.blob);
  }
  onProgress?.("Compactando...");
  const blob = await zip.generateAsync({ type: "blob" });
  saveBlob(blob, `kits-conexao-${items.length}.zip`);
}
