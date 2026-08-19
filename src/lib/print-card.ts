import bgFrontAsset from "@/assets/bg-f-cv.png.asset.json";
import bgBackAsset from "@/assets/bg-v-cv.png.asset.json";
import bgAntigoFrontAsset from "@/assets/bg-cv-antigo-f.png.asset.json";
import bgAntigoBackAsset from "@/assets/bg-cv-antigo-v.png.asset.json";
import logoAsset from "@/assets/logo-horizontal-branco.png.asset.json";
import fontRegularAsset from "@/assets/OpenSans-Regular.ttf.asset.json";
import fontBoldAsset from "@/assets/OpenSans-Bold.ttf.asset.json";
import fontItalicAsset from "@/assets/OpenSans-Italic.ttf.asset.json";
import fontFrutigerAsset from "@/assets/FrutigerLTStd-LightCn.otf.asset.json";
import { buildCardUrl } from "./qr";


/** Millimetre -> PDF point. */
const MM = 72 / 25.4;

/** Card geometry (mm). */
const TRIM_W = 90;
const TRIM_H = 48;
const BLEED = 3;
const MARKS = 8; // slug area for crop marks + colour proof
const PAGE_W = TRIM_W + 2 * BLEED + 2 * MARKS;
const PAGE_H = TRIM_H + 2 * BLEED + 2 * MARKS;
/** Origin (bottom-left) of the trim box inside the page, in mm. */
const OX = MARKS + BLEED;
const OY = MARKS + BLEED;

/**
 * Shared geometry of the printed card (mm, measured from the trim's top-left
 * corner). Exported so the on-screen preview matches the PDF exactly.
 */
export const CARD_TRIM = { w: TRIM_W, h: TRIM_H, bleed: BLEED };

export const CARD_LAYOUT = {
  qr: { x: 5.8, yTop: 10.8, size: 26.4, padding: 1 },
  textX: 37.3,
  /** baseline distance from top */
  nome: { baseline: 21.4, size: 11, color: "#ffffff" },
  cargo: { baseline: 25.4, size: 7, color: "#c59937" },
  /** logo + site block: top edge distance from top (default) and logo height */
  marca: { top: 29.2, logoHeight: 2.6 },
  site: { size: 4.5, color: "#6a7070", gap: 3.2 },
  backLogoWidth: 46,
} as const;

/** Allowed range (mm) for the user-configurable brand block. */
export const MARCA_LIMITS = {
  top: { min: 26, max: 38, step: 0.2 },
  logoHeight: { min: 1.6, max: 6, step: 0.1 },
} as const;

/**
 * Geometry of the "logo + site" block. The site baseline is derived so the
 * text is optically centred on the logo (both horizontally aligned).
 */
export function marcaGeometry(topMm?: number, logoHeightMm?: number) {
  const top = topMm ?? CARD_LAYOUT.marca.top;
  const logoHeight = logoHeightMm ?? CARD_LAYOUT.marca.logoHeight;
  /** cap-height of the site text (mm), used to centre it on the logo */
  const siteCap = CARD_LAYOUT.site.size * (25.4 / 72) * 0.72;
  return {
    logoTop: top,
    logoHeight,
    siteBaseline: top + logoHeight / 2 + siteCap / 2,
  };
}

/**
 * Layout do MODELO ANTIGO (arte com logo à esquerda e dados à direita).
 * Todas as medidas em mm a partir do canto superior esquerdo do corte.
 */
export const CARD_LAYOUT_ANTIGO = {
  textX: 32.7,
  nome: { baseline: 17.6, size: 12, color: "#004a8f" },
  cargo: { baseline: 21.2, size: 8, color: "#659ad2" },
  email: { baseline: 26.0, size: 7, color: "#000000", opacity: 0.7 },
  site: { baseline: 29.2, size: 7, color: "#000000", opacity: 0.7 },
  /** o rótulo "Tel.:" e o ícone do WhatsApp já fazem parte da arte de fundo;
   *  o celular fica alinhado horizontalmente ao ícone verde */
  celular: { x: 37.0, baseline: 33.7, size: 7, color: "#000000", opacity: 0.7 },
} as const;


/** Default artwork bundled with the app (used when the theme has no upload). */
export const DEFAULT_PRINT_ASSETS = {
  frenteUrl: bgFrontAsset.url as string,
  versoUrl: bgBackAsset.url as string,
  logoUrl: logoAsset.url as string,
  antigoFrenteUrl: bgAntigoFrontAsset.url as string,
  antigoVersoUrl: bgAntigoBackAsset.url as string,
  frutigerUrl: fontFrutigerAsset.url as string,
};

export type CardModelo = "novo" | "antigo";

export interface PrintCardInput {
  nome: string;
  nome_cartao?: string | null;
  cargo: string;
  slug: string;
  /** usados apenas no modelo antigo */
  whatsapp?: string | null;
  email?: string | null;
}

export interface PrintBackgrounds {
  modelo?: CardModelo;
  frenteUrl?: string;
  versoUrl?: string;
  antigoFrenteUrl?: string;
  antigoVersoUrl?: string;
  site?: string;
  /** distance (mm) from the card top to the top of the logo + site block */
  marcaTop?: number;
  /** logo height (mm) on the front card */
  marcaLogoAltura?: number;
}

/** Telefone no padrão do modelo antigo: 55 (11) 98877-6655 */
export function formatPhoneAntigo(raw: string | null | undefined): string {
  const d = (raw ?? "").includes("|")
    ? raw!.split("|")
    : [null];
  let ddi = "", ddd = "", number = "";
  if (d.length === 3) {
    ddi = (d[0] ?? "").replace(/\D/g, "");
    ddd = (d[1] ?? "").replace(/\D/g, "");
    number = (d[2] ?? "").replace(/\D/g, "");
  } else {
    const all = (raw ?? "").replace(/\D/g, "");
    if (!all) return "";
    number = all.slice(-9);
    ddd = all.slice(-11, -9);
    ddi = all.slice(0, Math.max(0, all.length - 11));
  }
  if (!number) return "";
  const n =
    number.length > 8
      ? `${number.slice(0, 5)}-${number.slice(5)}`
      : `${number.slice(0, number.length - 4)}-${number.slice(-4)}`;
  return [ddi, ddd ? `(${ddd})` : "", n].filter(Boolean).join(" ");
}

/** Loads print artwork + site from the global theme (falls back to defaults). */
export async function loadPrintOptions(): Promise<PrintBackgrounds> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { normalizeTheme } = await import("./types");
  const { data } = await supabase
    .from("theme_config")
    .select("config")
    .eq("id", "global")
    .maybeSingle();
  const theme = normalizeTheme(data?.config);
  return {
    modelo: theme.impressao.modelo,
    frenteUrl: theme.impressao.frenteUrl || undefined,
    versoUrl: theme.impressao.versoUrl || undefined,
    antigoFrenteUrl: theme.impressao.antigoFrenteUrl || undefined,
    antigoVersoUrl: theme.impressao.antigoVersoUrl || undefined,
    site: theme.institucional.site || undefined,
    marcaTop: theme.impressao.marcaTop,
    marcaLogoAltura: theme.impressao.marcaLogoAltura,
  };
}


function mm(v: number) {
  return v * MM;
}

/** Convert a point measured from the trim's top-left corner into PDF coords. */
function pt(xMm: number, yMmFromTop: number): { x: number; y: number } {
  return { x: mm(OX + xMm), y: mm(OY + TRIM_H - yMmFromTop) };
}

function rgbHex(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const base64 = url.slice(url.indexOf(",") + 1);
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar recurso: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

async function qrPngBytes(slug: string): Promise<Uint8Array> {
  const QRCode = (await import("qrcode")).default;
  const dataUrl = await QRCode.toDataURL(buildCardUrl(slug), {
    width: 1200,
    margin: 0,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
  return fetchBytes(dataUrl);
}

/** Builds a print-ready PDF (2 pages per collaborator: front + back). */
export async function buildPrintCardsPdf(
  items: PrintCardInput[],
  backgrounds: PrintBackgrounds = {},
): Promise<Uint8Array> {
  const [{ PDFDocument, rgb, degrees }, fontkitMod] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);
  void degrees;

  const pdf = await PDFDocument.create();
  pdf.registerFontkit((fontkitMod as any).default ?? fontkitMod);
  pdf.setTitle("Cartões de visita — Conexão Digital Implant");
  pdf.setCreator("Link Tree Corporativo");

  const isAntigo = backgrounds.modelo === "antigo";

  const [bold, italic, regular, frutiger, frontBytes, backBytes, logoBytes] = await Promise.all([
    fetchBytes(fontBoldAsset.url),
    fetchBytes(fontItalicAsset.url),
    fetchBytes(fontRegularAsset.url),
    fetchBytes(fontFrutigerAsset.url),
    fetchBytes(
      isAntigo
        ? backgrounds.antigoFrenteUrl || bgAntigoFrontAsset.url
        : backgrounds.frenteUrl || bgFrontAsset.url,
    ),
    fetchBytes(
      isAntigo
        ? backgrounds.antigoVersoUrl || bgAntigoBackAsset.url
        : backgrounds.versoUrl || bgBackAsset.url,
    ),
    fetchBytes(logoAsset.url),
  ]);

  const fontBold = await pdf.embedFont(bold, { subset: true });
  const fontItalic = await pdf.embedFont(italic, { subset: true });
  const fontRegular = await pdf.embedFont(regular, { subset: true });
  const fontFrutiger = await pdf.embedFont(frutiger, { subset: true });


  const embedImage = async (b: Uint8Array) =>
    isJpeg(b) ? pdf.embedJpg(b) : pdf.embedPng(b);
  const bgFront = await embedImage(frontBytes);
  const bgBack = await embedImage(backBytes);
  const logo = await embedImage(logoBytes);

  const site = (backgrounds.site || "www.conexao.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const generatedAt = new Date().toLocaleDateString("pt-BR");

  const newPage = (bg: typeof bgFront) => {
    const page = pdf.addPage([mm(PAGE_W), mm(PAGE_H)]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: mm(PAGE_W),
      height: mm(PAGE_H),
      color: rgb(1, 1, 1),
    });
    // Bleed filler: enlarged copy so the sangria area is never white,
    // drawn *behind* the real art.
    page.drawImage(bg, {
      x: mm(MARKS),
      y: mm(MARKS),
      width: mm(TRIM_W + 2 * BLEED),
      height: mm(TRIM_H + 2 * BLEED),
    });
    // Real artwork at exact trim size: gold bands stay fully inside the cut.
    page.drawImage(bg, {
      x: mm(OX),
      y: mm(OY),
      width: mm(TRIM_W),
      height: mm(TRIM_H),
    });
    return page;
  };


  const drawMarks = (page: any, label: string) => {
    const k = rgb(0, 0, 0);
    const len = mm(5);
    const t = 0.4;
    const x0 = mm(OX);
    const x1 = mm(OX + TRIM_W);
    const y0 = mm(OY);
    const y1 = mm(OY + TRIM_H);
    const line = (x: number, y: number, w: number, h: number) =>
      page.drawRectangle({ x, y, width: w, height: h, color: k });
    // horizontal marks (left/right of trim)
    [y0, y1].forEach((y) => {
      line(x0 - len - mm(1), y - t / 2, len, t);
      line(x1 + mm(1), y - t / 2, len, t);
    });
    // vertical marks (below/above trim)
    [x0, x1].forEach((x) => {
      line(x - t / 2, y0 - len - mm(1), t, len);
      line(x - t / 2, y1 + mm(1), t, len);
    });
    page.drawText(label, {
      x: mm(MARKS),
      y: mm(PAGE_H - 5),
      size: 5,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.35),
    });
  };

  const drawProofBar = (page: any) => {
    const swatches = [
      "#0b2e57", "#123a6b", "#c59937", "#e0c072", "#ffffff", "#6a7070",
      "#000000", "#404040", "#808080", "#bfbfbf",
      "#00ffff", "#ff00ff", "#ffff00", "#ff0000", "#00ff00", "#0000ff",
    ];
    const w = mm(3.2);
    const h = mm(3.2);
    const startX = mm(MARKS);
    const y = mm(2.2);
    swatches.forEach((hex, i) => {
      const c = rgbHex(hex);
      page.drawRectangle({
        x: startX + i * w,
        y,
        width: w,
        height: h,
        color: rgb(c.r, c.g, c.b),
        borderColor: rgb(0.75, 0.75, 0.75),
        borderWidth: 0.2,
      });
    });
    page.drawText(
      `90x48mm · sangria 3mm · prova de cor · ${generatedAt}`,
      {
        x: startX + swatches.length * w + mm(2),
        y: y + mm(1.1),
        size: 4,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      },
    );
  };

  for (const c of items) {
    const nome = (c.nome_cartao || c.nome).trim();
    const front = newPage(bgFront);

    if (isAntigo) {
      const L = CARD_LAYOUT_ANTIGO;
      const drawA = (
        text: string,
        x: number,
        baseline: number,
        size: number,
        hex: string,
        opacity = 1,
      ) => {
        if (!text) return;
        const col = rgbHex(hex);
        const p = pt(x, baseline);
        front.drawText(text, {
          x: p.x,
          y: p.y,
          size,
          font: fontFrutiger,
          color: rgb(col.r, col.g, col.b),
          opacity,
        });
      };
      drawA(nome, L.textX, L.nome.baseline, L.nome.size, L.nome.color);
      drawA(c.cargo, L.textX, L.cargo.baseline, L.cargo.size, L.cargo.color);
      drawA(c.email ?? "", L.textX, L.email.baseline, L.email.size, L.email.color, L.email.opacity);
      drawA(site, L.textX, L.site.baseline, L.site.size, L.site.color, L.site.opacity);
      drawA(
        formatPhoneAntigo(c.whatsapp),
        L.celular.x,
        L.celular.baseline,
        L.celular.size,
        L.celular.color,
        L.celular.opacity,
      );

      drawMarks(front, `${nome} — frente`);
      drawProofBar(front);

      const backA = newPage(bgBack);
      drawMarks(backA, `${nome} — verso`);
      drawProofBar(backA);
      continue;
    }

    // 1. QR Code
    const qr = await pdf.embedPng(await qrPngBytes(c.slug));
    const qrSize = CARD_LAYOUT.qr.size;
    const qrPos = pt(CARD_LAYOUT.qr.x, CARD_LAYOUT.qr.yTop + qrSize);
    const pad = mm(CARD_LAYOUT.qr.padding);
    front.drawRectangle({
      x: qrPos.x - pad,
      y: qrPos.y - pad,
      width: mm(qrSize) + pad * 2,
      height: mm(qrSize) + pad * 2,
      color: rgb(1, 1, 1),
    });
    front.drawImage(qr, { x: qrPos.x, y: qrPos.y, width: mm(qrSize), height: mm(qrSize) });

    const textX = CARD_LAYOUT.textX;

    // 2. Nome — Open Sans Bold 11pt #FFFFFF (tamanho fixo, regra inegociável)
    const nomeSize = CARD_LAYOUT.nome.size;
    const nomePos = pt(textX, CARD_LAYOUT.nome.baseline);
    front.drawText(nome, {
      x: nomePos.x,
      y: nomePos.y,
      size: nomeSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // 3. Cargo — Open Sans Itálico 7pt #C59937 (tamanho fixo, regra inegociável)
    const cargoSize = CARD_LAYOUT.cargo.size;
    const cargoPos = pt(textX, CARD_LAYOUT.cargo.baseline);
    const gold = rgbHex(CARD_LAYOUT.cargo.color);
    front.drawText(c.cargo, {
      x: cargoPos.x,
      y: cargoPos.y,
      size: cargoSize,
      font: fontItalic,
      color: rgb(gold.r, gold.g, gold.b),
    });

    // 4. Logo horizontal (bloco marca: logo + site alinhados horizontalmente)
    const marca = marcaGeometry(backgrounds.marcaTop, backgrounds.marcaLogoAltura);
    const logoH = marca.logoHeight;
    const logoW = (logo.width / logo.height) * logoH;
    const logoPos = pt(textX, marca.logoTop + logoH);
    front.drawImage(logo, {
      x: logoPos.x,
      y: logoPos.y,
      width: mm(logoW),
      height: mm(logoH),
    });

    // 5. Site — Open Sans Itálico 4,5pt #6A7070
    const siteColor = rgbHex(CARD_LAYOUT.site.color);
    const sitePos = pt(textX + logoW + CARD_LAYOUT.site.gap, marca.siteBaseline);
    front.drawText(site, {
      x: sitePos.x,
      y: sitePos.y,
      size: CARD_LAYOUT.site.size,
      font: fontItalic,
      color: rgb(siteColor.r, siteColor.g, siteColor.b),
    });

    drawMarks(front, `${nome} — frente`);
    drawProofBar(front);

    const back = newPage(bgBack);
    // Verso: logo horizontal centralizado
    const backLogoW = CARD_LAYOUT.backLogoWidth;
    const backLogoH = (logo.height / logo.width) * backLogoW;
    back.drawImage(logo, {
      x: mm(OX + (TRIM_W - backLogoW) / 2),
      y: mm(OY + (TRIM_H - backLogoH) / 2),
      width: mm(backLogoW),
      height: mm(backLogoH),
    });
    drawMarks(back, `${nome} — verso`);
    drawProofBar(back);
  }


  return pdf.save();
}

function safeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function downloadPrintCard(c: PrintCardInput, bgs: PrintBackgrounds = {}) {
  const bytes = await buildPrintCardsPdf([c], bgs);
  downloadPdf(bytes, `cartao-${c.slug || safeName(c.nome)}.pdf`);
}

export async function downloadPrintCardsBatch(items: PrintCardInput[], bgs: PrintBackgrounds = {}) {
  const bytes = await buildPrintCardsPdf(items, bgs);
  downloadPdf(bytes, `cartoes-impressao-${items.length}.pdf`);
}

/** Gera o PDF real e abre em nova aba para conferência antes da impressão. */
export async function openPrintCardPdf(items: PrintCardInput[], bgs: PrintBackgrounds = {}) {
  const bytes = await buildPrintCardsPdf(items, bgs);
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
