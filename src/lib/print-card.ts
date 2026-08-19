import bgFrontAsset from "@/assets/bg-f-cv.png.asset.json";
import bgBackAsset from "@/assets/bg-v-cv.png.asset.json";
import logoAsset from "@/assets/logo-horizontal-branco.png.asset.json";
import fontRegularAsset from "@/assets/OpenSans-Regular.ttf.asset.json";
import fontBoldAsset from "@/assets/OpenSans-Bold.ttf.asset.json";
import fontItalicAsset from "@/assets/OpenSans-Italic.ttf.asset.json";
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

export interface PrintCardInput {
  nome: string;
  nome_cartao?: string | null;
  cargo: string;
  slug: string;
}

export interface PrintBackgrounds {
  frenteUrl?: string;
  versoUrl?: string;
  site?: string;
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
    frenteUrl: theme.impressao.frenteUrl || undefined,
    versoUrl: theme.impressao.versoUrl || undefined,
    site: theme.institucional.site || undefined,
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

  const [bold, italic, regular, frontBytes, backBytes, logoBytes] = await Promise.all([
    fetchBytes(fontBoldAsset.url),
    fetchBytes(fontItalicAsset.url),
    fetchBytes(fontRegularAsset.url),
    fetchBytes(backgrounds.frenteUrl || bgFrontAsset.url),
    fetchBytes(backgrounds.versoUrl || bgBackAsset.url),
    fetchBytes(logoAsset.url),
  ]);

  const fontBold = await pdf.embedFont(bold, { subset: true });
  const fontItalic = await pdf.embedFont(italic, { subset: true });
  const fontRegular = await pdf.embedFont(regular, { subset: true });

  const embedImage = async (b: Uint8Array) =>
    isJpeg(b) ? pdf.embedJpg(b) : pdf.embedPng(b);
  const bgFront = await embedImage(frontBytes);
  const bgBack = await embedImage(backBytes);
  const logo = await embedImage(logoBytes);

  const site = backgrounds.site || "www.conexao.com.br";
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
    // Background covers trim + bleed
    page.drawImage(bg, {
      x: mm(MARKS),
      y: mm(MARKS),
      width: mm(TRIM_W + 2 * BLEED),
      height: mm(TRIM_H + 2 * BLEED),
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
    const w = mm(4);
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
        size: 4.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      },
    );
  };

  /** Shrink the size until the text fits maxWidth. */
  const fitSize = (text: string, font: any, size: number, maxWidthMm: number) => {
    let s = size;
    while (s > 5 && font.widthOfTextAtSize(text, s) > mm(maxWidthMm)) s -= 0.25;
    return s;
  };

  for (const c of items) {
    const nome = (c.nome_cartao || c.nome).trim();
    const front = newPage(bgFront);

    // 1. QR Code
    const qr = await pdf.embedPng(await qrPngBytes(c.slug));
    const qrSize = 26.4;
    const qrPos = pt(5.8, 10.8 + qrSize);
    const pad = mm(1);
    front.drawRectangle({
      x: qrPos.x - pad,
      y: qrPos.y - pad,
      width: mm(qrSize) + pad * 2,
      height: mm(qrSize) + pad * 2,
      color: rgb(1, 1, 1),
    });
    front.drawImage(qr, { x: qrPos.x, y: qrPos.y, width: mm(qrSize), height: mm(qrSize) });

    const textX = 37.3;
    const maxTextW = TRIM_W - textX - 5;

    // 2. Nome — Open Sans Bold 11pt #FFFFFF
    const nomeSize = fitSize(nome, fontBold, 11, maxTextW);
    const nomePos = pt(textX, 21.4);
    front.drawText(nome, {
      x: nomePos.x,
      y: nomePos.y,
      size: nomeSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // 3. Cargo — Open Sans Itálico 7pt #C59937
    const cargoSize = fitSize(c.cargo, fontItalic, 7, maxTextW);
    const cargoPos = pt(textX, 24.6);
    const gold = rgbHex("#c59937");
    front.drawText(c.cargo, {
      x: cargoPos.x,
      y: cargoPos.y,
      size: cargoSize,
      font: fontItalic,
      color: rgb(gold.r, gold.g, gold.b),
    });

    // 4. Logo horizontal
    const logoH = 3.4;
    const logoW = (logo.width / logo.height) * logoH;
    const logoPos = pt(textX, 29.6);
    front.drawImage(logo, {
      x: logoPos.x,
      y: logoPos.y,
      width: mm(logoW),
      height: mm(logoH),
    });

    // 5. Site — Open Sans Itálico 4,5pt #6A7070
    const siteColor = rgbHex("#6a7070");
    const sitePos = pt(textX + logoW + 3.5, 27.8);
    front.drawText(site, {
      x: sitePos.x,
      y: sitePos.y,
      size: 4.5,
      font: fontItalic,
      color: rgb(siteColor.r, siteColor.g, siteColor.b),
    });

    drawMarks(front, `${nome} — frente`);
    drawProofBar(front);

    const back = newPage(bgBack);
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
