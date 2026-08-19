/**
 * Converte links de serviços de nuvem (Google Drive, Dropbox, OneDrive) em URLs
 * de download direto e baixa a imagem convertendo para data URL (PNG),
 * garantindo que a arte funcione no PDF sem depender do serviço externo.
 */

/** Normaliza um link de compartilhamento para URL de imagem direta. */
export function normalizeImageLink(raw: string): string {
  const url = raw.trim();
  if (!url) return "";

  // Google Drive: /file/d/<id>/view  ou  ?id=<id>
  const gd =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) ??
    url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*id=([\w-]+)/);
  if (gd) return `https://drive.google.com/uc?export=download&id=${gd[1]}`;

  // Google Docs / Photos (lh3) já servem direto
  // Dropbox
  if (/dropbox\.com/.test(url)) {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace(/[?&]dl=0/, "")
      .replace(/[?&]st=[^&]*/, "");
  }

  // OneDrive / SharePoint
  if (/1drv\.ms|onedrive\.live\.com|sharepoint\.com/.test(url)) {
    return url.includes("download=1")
      ? url
      : url + (url.includes("?") ? "&" : "?") + "download=1";
  }

  return url;
}

/** Baixa a imagem do link e devolve um data URL PNG redimensionado. */
export async function imageLinkToDataUrl(raw: string, maxDim = 1400): Promise<string> {
  const url = normalizeImageLink(raw);
  if (!url) throw new Error("Informe um link válido");

  const res = await fetch(url, { mode: "cors" }).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(
      "Não foi possível baixar a imagem desse link. Verifique se o compartilhamento está público ou faça o upload do arquivo.",
    );
  }
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("O link não aponta para uma imagem. Use o link direto do arquivo.");
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Imagem inválida"));
      el.src = objectUrl;
    });
    const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
