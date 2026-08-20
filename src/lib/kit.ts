import type { Collaborator } from "./types";
import { normalizeTheme } from "./types";
import { buildCardUrl, buildKitUrl } from "./qr";
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

export interface KitStepState {
  /** Etapa cumprida (automática ou marcada pelo admin). */
  done: boolean;
  /** O arquivo realmente pode ser gerado a partir dos dados existentes. */
  deliverable: boolean;
  /** Etapa dispensada para este colaborador: não entra no kit nem no total. */
  skipped: boolean;
  reason?: string;
  manual?: boolean;
}

export interface KitStatus {
  steps: Record<KitStepKey, KitStepState>;
  completed: number;
  /** Total de etapas exigidas (desconta as dispensadas). */
  total: number;
  ready: boolean;
}

/** Etapas marcadas manualmente como concluídas pelo admin. */
export function manualSteps(c: Collaborator): Record<KitStepKey, boolean> {
  const raw = (c.kit_manual ?? {}) as Record<string, unknown>;
  const on = (v: unknown) => v === true;
  return {
    foto: on(raw.foto),
    linktree: on(raw.linktree),
    assinatura: on(raw.assinatura),
    cartao: on(raw.cartao),
  };
}

/** Etapas explicitamente dispensadas (hoje só a foto de perfil). */
export function skippedSteps(c: Collaborator): Record<KitStepKey, boolean> {
  const raw = (c.kit_manual ?? {}) as Record<string, unknown>;
  const off = (v: unknown) => v === "dispensada";
  return {
    foto: off(raw.foto),
    linktree: off(raw.linktree),
    assinatura: off(raw.assinatura),
    cartao: off(raw.cartao),
  };
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

  const auto: Record<KitStepKey, { done: boolean; reason?: string }> = {
    foto,
    linktree,
    assinatura,
    cartao,
  };
  const manual = manualSteps(c);
  const skipped = skippedSteps(c);
  /** Materiais que dependem de arquivo binário não podem ser "marcados" como prontos. */
  const hasPhotoAsset = has(c.foto_recortada_url) || has(c.foto_url);

  const steps = Object.fromEntries(
    (Object.keys(auto) as KitStepKey[]).map((k): [KitStepKey, KitStepState] => {
      if (skipped[k]) {
        return [
          k,
          {
            done: true,
            deliverable: false,
            skipped: true,
            reason: "Dispensada para este colaborador.",
          },
        ];
      }
      // A foto nunca fica pronta por marcação manual: depende do arquivo recortado.
      const canMarkManually = k !== "foto";
      const base =
        canMarkManually && manual[k] && !auto[k].done
          ? { done: true, reason: "Marcado como concluído pelo administrador." }
          : auto[k];
      const deliverable = k === "foto" ? hasPhotoAsset : base.done;
      return [
        k,
        {
          done: base.done,
          deliverable,
          skipped: false,
          reason: base.reason,
          manual: canMarkManually ? manual[k] : false,
        },
      ];
    }),
  ) as Record<KitStepKey, KitStepState>;

  const required = (Object.keys(steps) as KitStepKey[]).filter((k) => !steps[k].skipped);
  const completed = required.filter((k) => steps[k].done).length;
  return { steps, completed, total: required.length, ready: completed === required.length };
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
  if (c.foto_recortada_url || c.foto_url) {
    const linktreeOnly = !c.foto_recortada_url && !!c.foto_url;
    const saved = normalizeFrame(c.foto_perfil_ajuste);
    const photo = await profilePhotoBlob({
      personUrl: c.foto_recortada_url ?? c.foto_url,
      bgUrl: opts.profileBgUrl || null,
      frame: linktreeOnly ? { ...saved, mode: "estatico" } : saved,
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
    kitUrl: buildKitUrl(c.slug),
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
