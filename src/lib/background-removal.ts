/**
 * Remoção de fundo executada no próprio navegador (IA local).
 * O modelo (~20 MB) só é baixado quando a função é chamada pela primeira vez.
 */
export async function removeBackground(
  file: File | Blob,
  onProgress?: (label: string) => void,
): Promise<string> {
  const { removeBackground: imglyRemove } = await import("@imgly/background-removal");
  const blob = await imglyRemove(file, {
    output: { format: "image/png", quality: 0.9 },
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      const pct = total ? Math.round((current / total) * 100) : 0;
      onProgress(key.startsWith("fetch") ? `Baixando modelo... ${pct}%` : `Processando... ${pct}%`);
    },
  });
  return await blobToDataUrl(blob);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(blob);
  });
}

/**
 * Recorta as bordas transparentes e redimensiona o PNG para no máximo `maxDim`,
 * mantendo o canal alpha. Deixa o arquivo leve o bastante para armazenar.
 */
export async function trimAndResizePng(dataUrl: string, maxDim = 1400): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Imagem inválida"));
    i.src = dataUrl;
  });

  const src = document.createElement("canvas");
  src.width = img.width;
  src.height = img.height;
  const sctx = src.getContext("2d");
  if (!sctx) throw new Error("Canvas não suportado");
  sctx.drawImage(img, 0, 0);

  const { data } = sctx.getImageData(0, 0, src.width, src.height);
  let minX = src.width;
  let minY = src.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (data[(y * src.width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    minX = 0;
    minY = 0;
    maxX = src.width - 1;
    maxY = src.height - 1;
  }

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const ratio = Math.min(1, maxDim / Math.max(cw, ch));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(cw * ratio));
  out.height = Math.max(1, Math.round(ch * ratio));
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas não suportado");
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src, minX, minY, cw, ch, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
