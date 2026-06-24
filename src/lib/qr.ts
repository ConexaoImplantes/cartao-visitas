import QRCode from "qrcode";

export function buildCardUrl(id: string): string {
  if (typeof window === "undefined") return `/cartao/${id}`;
  return `${window.location.origin}/cartao/${id}`;
}

export async function generateQrDataUrl(id: string): Promise<string> {
  return QRCode.toDataURL(buildCardUrl(id), {
    width: 1024,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
}

export async function downloadQrPng(id: string, name: string) {
  const dataUrl = await generateQrDataUrl(id);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `qrcode-${slug(name)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
