import bgAsset from "@/assets/fp-bg.png.asset.json";
import bgCleanAsset from "@/assets/fp-bg-clean.png.asset.json";
import bgFotoAsset from "@/assets/bg-foto.png.asset.json";
import douradoAsset from "@/assets/dourado-foto.png.asset.json";

/** Arte da foto de perfil: 1080 x 1080 px. */
export const PROFILE_SIZE = 1080;

/**
 * Grid de referência (3 colunas x 4 linhas = 12 partes).
 * O rosto deve ficar centrado no quadrante 5 (linha 2, coluna 2).
 */
export const PROFILE_GRID = { cols: 3, rows: 4 } as const;

export const FACE_TARGET = {
  x: (PROFILE_SIZE / PROFILE_GRID.cols) * 1.5, // centro horizontal do quadrante 5
  y: (PROFILE_SIZE / PROFILE_GRID.rows) * 1.5, // centro vertical do quadrante 5
} as const;

/** Enquadramento determinístico padrão da pessoa dentro da arte. */
export const DEFAULT_FRAME = {
  /** Altura da pessoa como fração do lado da arte (1 = 1080px). */
  zoom: 1,
  /** Deslocamento horizontal em px (positivo = direita). */
  x: 0,
  /** Deslocamento vertical em px (positivo = baixo). */
  y: 0,
} as const;

export type ProfileFrame = { zoom: number; x: number; y: number };

export const FRAME_LIMITS = {
  zoom: { min: 0.6, max: 1.8, step: 0.01 },
  x: { min: -400, max: 400, step: 2 },
  y: { min: -1000, max: 1000, step: 2 },
} as const;

/** Base de composição: pessoa ancorada na base, alinhada à direita do círculo. */
const BASE_HEIGHT = 0.94; // fração do lado
const BASE_CENTER_X = PROFILE_SIZE * 0.58;

export const DEFAULT_PROFILE_BACKGROUNDS = {
  /** Fundo padrão (dourado + círculo claro + logo). */
  bgUrl: bgAsset.url as string,
  /** Variante clara sem moldura dourada. */
  cleanUrl: bgCleanAsset.url as string,
  /** Camada de fundo (base) da composição. */
  baseUrl: bgFotoAsset.url as string,
  /** Moldura dourada que fica acima da foto do colaborador. */
  overlayUrl: douradoAsset.url as string,
};

export function normalizeFrame(input: unknown): ProfileFrame {
  const f = (input ?? {}) as Partial<ProfileFrame>;
  const clamp = (v: number | undefined, d: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
  return {
    zoom: clamp(f.zoom, DEFAULT_FRAME.zoom, FRAME_LIMITS.zoom.min, FRAME_LIMITS.zoom.max),
    x: clamp(f.x, DEFAULT_FRAME.x, FRAME_LIMITS.x.min, FRAME_LIMITS.x.max),
    y: clamp(f.y, DEFAULT_FRAME.y, FRAME_LIMITS.y.min, FRAME_LIMITS.y.max),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    img.src = src;
  });
}

/**
 * Gera (e memoriza) a camada dourada da arte padrão: os pixels em que o fundo
 * padrão difere da variante limpa (moldura dourada + logo). Essa camada é
 * desenhada por cima da pessoa, deixando a foto na camada de baixo.
 */
let goldOverlayPromise: Promise<HTMLCanvasElement | null> | null = null;

async function getGoldOverlay(): Promise<HTMLCanvasElement | null> {
  if (!goldOverlayPromise) {
    goldOverlayPromise = (async () => {
      try {
        const [bg, clean] = await Promise.all([
          loadImage(DEFAULT_PROFILE_BACKGROUNDS.bgUrl),
          loadImage(DEFAULT_PROFILE_BACKGROUNDS.cleanUrl),
        ]);
        const s = PROFILE_SIZE;
        const mk = (img: HTMLImageElement) => {
          const c = document.createElement("canvas");
          c.width = s;
          c.height = s;
          const cx = c.getContext("2d", { willReadFrequently: true })!;
          cx.drawImage(img, 0, 0, s, s);
          return cx.getImageData(0, 0, s, s);
        };
        const a = mk(bg);
        const b = mk(clean);
        const out = document.createElement("canvas");
        out.width = s;
        out.height = s;
        const octx = out.getContext("2d")!;
        const od = octx.createImageData(s, s);
        for (let i = 0; i < a.data.length; i += 4) {
          const d = Math.max(
            Math.abs(a.data[i] - b.data[i]),
            Math.abs(a.data[i + 1] - b.data[i + 1]),
            Math.abs(a.data[i + 2] - b.data[i + 2]),
            Math.abs(a.data[i + 3] - b.data[i + 3]),
          );
          od.data[i] = a.data[i];
          od.data[i + 1] = a.data[i + 1];
          od.data[i + 2] = a.data[i + 2];
          od.data[i + 3] = d <= 8 ? 0 : Math.min(255, Math.round((d / 40) * 255));
        }
        octx.putImageData(od, 0, 0);
        return out;
      } catch {
        return null;
      }
    })();
  }
  return goldOverlayPromise;
}

export interface ProfileComposeInput {
  /** PNG (data URL) da pessoa já sem fundo. */
  personUrl?: string | null;
  /** Fundo customizado (data URL ou URL). Vazio = arte padrão. */
  bgUrl?: string | null;
  frame?: Partial<ProfileFrame>;
}

/** Desenha a arte 1080x1080 em um canvas e o devolve. */
export async function composeProfilePhoto(
  input: ProfileComposeInput,
  size = PROFILE_SIZE,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");
  ctx.imageSmoothingQuality = "high";

  const scale = size / PROFILE_SIZE;

  const bg = await loadImage(input.bgUrl || DEFAULT_PROFILE_BACKGROUNDS.baseUrl);
  ctx.drawImage(bg, 0, 0, size, size);

  if (input.personUrl) {
    const frame = normalizeFrame(input.frame);
    const person = await loadImage(input.personUrl);
    const h = PROFILE_SIZE * BASE_HEIGHT * frame.zoom;
    const w = (person.width / person.height) * h;
    const x = BASE_CENTER_X + frame.x - w / 2;
    const y = PROFILE_SIZE - h + frame.y;
    ctx.drawImage(person, x * scale, y * scale, w * scale, h * scale);
  }

  // Camada 1 (topo): moldura dourada — sempre acima da foto e do fundo.
  const overlay = await getGoldOverlay();
  if (overlay) ctx.drawImage(overlay, 0, 0, size, size);

  return canvas;
}

export async function profilePhotoDataUrl(
  input: ProfileComposeInput,
  size = PROFILE_SIZE,
): Promise<string> {
  const canvas = await composeProfilePhoto(input, size);
  return canvas.toDataURL("image/png");
}

export async function profilePhotoBlob(
  input: ProfileComposeInput,
  size = PROFILE_SIZE,
): Promise<Blob> {
  const canvas = await composeProfilePhoto(input, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar PNG"))), "image/png"),
  );
}

export function profileFileName(nome: string) {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `foto-perfil-${base || "colaborador"}.png`;
}

export async function downloadProfilePhoto(nome: string, input: ProfileComposeInput) {
  const blob = await profilePhotoBlob(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = profileFileName(nome);
  a.click();
  URL.revokeObjectURL(url);
}
