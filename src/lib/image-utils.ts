/**
 * Resize and compress an image File to a base64 data URL.
 * Square crop centered, max dimension `size`, JPEG quality `quality`.
 */
export async function compressImage(file: File, size = 480, quality = 0.82): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");
  const min = Math.min(img.width, img.height);
  const sx = (img.width - min) / 2;
  const sy = (img.height - min) / 2;
  ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Resize keeping aspect ratio. Max dimension defaults to 512px.
 * PNG output preserves transparency (good for logos).
 */
export async function compressImageContain(
  file: File,
  maxDim = 512,
): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
