import bgAsset from "@/assets/ass-email-bg.png.asset.json";
import fontRegularAsset from "@/assets/OpenSans-Regular.ttf.asset.json";
import fontBoldAsset from "@/assets/OpenSans-Bold.ttf.asset.json";
import fontItalicAsset from "@/assets/OpenSans-Italic.ttf.asset.json";
import arimoAsset from "@/assets/Arimo-Regular.ttf.asset.json";
import { buildCardUrl } from "./qr";
import { decodePhone, maskNumberOnly } from "./types";

/** Arte da assinatura de e-mail: 150 x 50 mm. */
export const SIGN_TRIM = { w: 150, h: 50 } as const;

/** Resolução de exportação (PNG). */
export const SIGN_DPI = 300;

/**
 * Geometria (mm, a partir do canto superior esquerdo). As mesmas constantes
 * são usadas pelo preview HTML e pela exportação em PNG.
 */
export const SIGN_LAYOUT = {
  nome: { x: 59.9, baseline: 10.24, size: 16, color: "#ffffff" },
  cargo: { x: 59.9, baseline: 15.1, size: 11, color: "#c59937" },
  celular: { x: 67.56, baseline: 26.16, size: 9, color: "#ffffff" },
  email: { x: 67.56, baseline: 33.65, size: 9, color: "#ffffff" },
  /** `padding` = respiro branco em volta do QR (obrigatório para leitura). */
  qr: { x: 125.1, top: 22.8, size: 19.5, padding: 1.4 },
} as const;

export const DEFAULT_SIGNATURE_ASSETS = {
  bgUrl: bgAsset.url as string,
};

export const SIGN_FONTS = {
  openSansRegular: fontRegularAsset.url as string,
  openSansBold: fontBoldAsset.url as string,
  openSansItalic: fontItalicAsset.url as string,
  arimo: arimoAsset.url as string,
};

export interface SignatureInput {
  nome: string;
  nome_cartao?: string | null;
  cargo: string;
  email: string;
  whatsapp?: string | null;
  slug: string;
}

export interface SignatureOptions {
  bgUrl?: string;
}

/** pt -> mm */
export const PT_MM = 25.4 / 72;

/** Nome exibido na assinatura. */
export function signatureNome(c: SignatureInput) {
  return (c.nome_cartao || c.nome || "").trim();
}

/** Celular no padrão "+55 11 98877-6655". */
export function signatureCelular(raw: string | null | undefined): string {
  const { ddi, ddd, number } = decodePhone(raw);
  if (!ddd && !number) return "";
  const parts: string[] = [];
  if (ddi) parts.push(`+${ddi}`);
  if (ddd) parts.push(ddd);
  const n = maskNumberOnly(number) || number;
  if (n) parts.push(n);
  return parts.join(" ");
}

/** Carrega a arte de fundo configurada no tema (ou a padrão). */
export async function loadSignatureOptions(): Promise<SignatureOptions> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { normalizeTheme } = await import("./types");
  const { data } = await supabase
    .from("theme_config")
    .select("config")
    .eq("id", "global")
    .maybeSingle();
  const theme = normalizeTheme(data?.config);
  return { bgUrl: theme.assinatura.bgUrl || undefined };
}

/* ------------------------------- fonts ---------------------------------- */

let fontsPromise: Promise<void> | null = null;

/** Carrega Open Sans (regular/bold/italic) e Arimo para uso em canvas/CSS. */
export function ensureSignatureFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return Promise.resolve();
  if (fontsPromise) return fontsPromise;
  fontsPromise = Promise.all([
    new FontFace("SignOpenSans", `url(${SIGN_FONTS.openSansRegular})`).load(),
    new FontFace("SignOpenSans", `url(${SIGN_FONTS.openSansBold})`, { weight: "700" }).load(),
    new FontFace("SignOpenSans", `url(${SIGN_FONTS.openSansItalic})`, { style: "italic" }).load(),
    new FontFace("SignArimo", `url(${SIGN_FONTS.arimo})`).load(),
  ])
    .then((faces) => {
      faces.forEach((f) => (document as any).fonts.add(f));
    })
    .then(() => undefined)
    .catch(() => undefined);
  return fontsPromise;
}

/* ------------------------------ rendering -------------------------------- */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

async function qrDataUrl(slug: string, px: number): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(buildCardUrl(slug), {
    width: Math.max(200, Math.round(px)),
    margin: 0,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/** Renderiza a assinatura em um canvas e devolve o Blob PNG. */
export async function renderSignaturePng(
  card: SignatureInput,
  opts: SignatureOptions = {},
  dpi = SIGN_DPI,
): Promise<Blob> {
  await ensureSignatureFonts();
  const pxPerMm = dpi / 25.4;
  const mm = (v: number) => v * pxPerMm;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(mm(SIGN_TRIM.w));
  canvas.height = Math.round(mm(SIGN_TRIM.h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado neste navegador");

  const bg = await loadImage(opts.bgUrl || DEFAULT_SIGNATURE_ASSETS.bgUrl);
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  const fontPx = (pt: number) => pt * (dpi / 72);
  ctx.textBaseline = "alphabetic";

  // Nome
  ctx.font = `700 ${fontPx(SIGN_LAYOUT.nome.size)}px SignOpenSans, sans-serif`;
  ctx.fillStyle = SIGN_LAYOUT.nome.color;
  ctx.fillText(signatureNome(card), mm(SIGN_LAYOUT.nome.x), mm(SIGN_LAYOUT.nome.baseline));

  // Cargo
  ctx.font = `italic ${fontPx(SIGN_LAYOUT.cargo.size)}px SignOpenSans, sans-serif`;
  ctx.fillStyle = SIGN_LAYOUT.cargo.color;
  ctx.fillText((card.cargo || "").trim(), mm(SIGN_LAYOUT.cargo.x), mm(SIGN_LAYOUT.cargo.baseline));

  // Celular
  const cel = signatureCelular(card.whatsapp);
  ctx.font = `${fontPx(SIGN_LAYOUT.celular.size)}px SignArimo, Arial, sans-serif`;
  ctx.fillStyle = SIGN_LAYOUT.celular.color;
  if (cel) ctx.fillText(cel, mm(SIGN_LAYOUT.celular.x), mm(SIGN_LAYOUT.celular.baseline));

  // E-mail
  ctx.font = `${fontPx(SIGN_LAYOUT.email.size)}px SignArimo, Arial, sans-serif`;
  ctx.fillStyle = SIGN_LAYOUT.email.color;
  ctx.fillText((card.email || "").trim(), mm(SIGN_LAYOUT.email.x), mm(SIGN_LAYOUT.email.baseline));

  // QR Code
  if (card.slug) {
    const pad = mm(SIGN_LAYOUT.qr.padding);
    const box = mm(SIGN_LAYOUT.qr.size);
    const inner = box - pad * 2;
    const qr = await loadImage(await qrDataUrl(card.slug, inner));
    const x = mm(SIGN_LAYOUT.qr.x);
    const y = mm(SIGN_LAYOUT.qr.top);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, box, box);
    ctx.drawImage(qr, x + pad, y + pad, inner, inner);
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar o PNG"))),
      "image/png",
    ),
  );
}

function slugFallback(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

/** Baixa a assinatura de um colaborador em PNG. */
export async function downloadSignaturePng(card: SignatureInput, opts: SignatureOptions = {}) {
  const blob = await renderSignaturePng(card, opts);
  saveBlob(blob, `assinatura-${card.slug || slugFallback(card.nome)}.png`);
}

/** Baixa um PNG por colaborador selecionado. */
export async function downloadSignaturesBatch(
  cards: SignatureInput[],
  opts: SignatureOptions = {},
) {
  for (const card of cards) {
    await downloadSignaturePng(card, opts);
    await new Promise((r) => setTimeout(r, 350));
  }
}

/** Abre a arte gerada em uma nova aba (conferência em tamanho real). */
export async function openSignaturePng(card: SignatureInput, opts: SignatureOptions = {}) {
  const blob = await renderSignaturePng(card, opts);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
