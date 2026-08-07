import QRCode from "qrcode";

export function buildCardUrl(slug: string): string {
  if (typeof window === "undefined") return `/${slug}`;
  return `${window.location.origin}/${slug}`;
}

export async function generateQrDataUrl(slug: string): Promise<string> {
  return QRCode.toDataURL(buildCardUrl(slug), {
    width: 1024,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}

export async function downloadQrPng(slug: string, name: string) {
  const dataUrl = await generateQrDataUrl(slug);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `qrcode-${slug || slugify(name)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
