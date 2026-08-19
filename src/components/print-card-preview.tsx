import { useEffect, useState } from "react";
import {
  CARD_LAYOUT,
  CARD_TRIM,
  DEFAULT_PRINT_ASSETS,
  type PrintCardInput,
} from "@/lib/print-card";
import { buildCardUrl } from "@/lib/qr";
import fontRegularAsset from "@/assets/OpenSans-Regular.ttf.asset.json";
import fontBoldAsset from "@/assets/OpenSans-Bold.ttf.asset.json";
import fontItalicAsset from "@/assets/OpenSans-Italic.ttf.asset.json";

/** pt -> mm */
const PT = 25.4 / 72;
/** Approximate ascent used to convert a PDF baseline into a CSS top offset. */
const ASCENT = 0.75;

let fontsPromise: Promise<void> | null = null;
function ensureFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  if (fontsPromise) return fontsPromise;
  fontsPromise = Promise.all([
    new FontFace("OpenSansPreview", `url(${fontRegularAsset.url})`).load(),
    new FontFace("OpenSansPreview", `url(${fontBoldAsset.url})`, { weight: "700" }).load(),
    new FontFace("OpenSansPreview", `url(${fontItalicAsset.url})`, { style: "italic" }).load(),
  ])
    .then((faces) => {
      faces.forEach((f) => (document as any).fonts.add(f));
    })
    .catch(() => {});
  return fontsPromise;
}

export interface PrintCardPreviewProps {
  card: PrintCardInput;
  frenteUrl?: string;
  versoUrl?: string;
  site?: string;
  /** Pixels per millimetre (preview resolution). */
  scale?: number;
  side?: "frente" | "verso";
}

export function PrintCardPreview({
  card,
  frenteUrl,
  versoUrl,
  site,
  scale = 5,
  side = "frente",
}: PrintCardPreviewProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [, setFontsReady] = useState(false);

  useEffect(() => {
    const p = ensureFonts();
    if (p) p.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    let alive = true;
    if (!card.slug) {
      setQr(null);
      return;
    }
    import("qrcode")
      .then((m) =>
        m.default.toDataURL(buildCardUrl(card.slug), {
          width: 600,
          margin: 0,
          errorCorrectionLevel: "H",
          color: { dark: "#000000", light: "#ffffff" },
        }),
      )
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [card.slug]);

  const px = (mm: number) => `${mm * scale}px`;
  const nome = (card.nome_cartao || card.nome || "").trim();
  const siteText = (site || "www.conexao.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const bg = side === "frente"
    ? frenteUrl || DEFAULT_PRINT_ASSETS.frenteUrl
    : versoUrl || DEFAULT_PRINT_ASSETS.versoUrl;

  const baselineTop = (baselineMm: number, sizePt: number) =>
    baselineMm - sizePt * PT * ASCENT;

  const backLogoW = CARD_LAYOUT.backLogoWidth;

  return (
    <div
      className="relative overflow-hidden rounded-[2px] shadow-lg ring-1 ring-black/10"
      style={{
        width: px(CARD_TRIM.w),
        height: px(CARD_TRIM.h),
        fontFamily: "OpenSansPreview, system-ui, sans-serif",
      }}
    >
      <img
        src={bg}
        alt=""
        className="absolute inset-0 h-full w-full object-fill"
        draggable={false}
      />

      {side === "frente" ? (
        <>
          {/* QR */}
          <div
            className="absolute bg-white"
            style={{
              left: px(CARD_LAYOUT.qr.x - CARD_LAYOUT.qr.padding),
              top: px(CARD_LAYOUT.qr.yTop - CARD_LAYOUT.qr.padding),
              width: px(CARD_LAYOUT.qr.size + CARD_LAYOUT.qr.padding * 2),
              height: px(CARD_LAYOUT.qr.size + CARD_LAYOUT.qr.padding * 2),
            }}
          >
            {qr && (
              <img
                src={qr}
                alt="QR Code"
                style={{
                  position: "absolute",
                  left: px(CARD_LAYOUT.qr.padding),
                  top: px(CARD_LAYOUT.qr.padding),
                  width: px(CARD_LAYOUT.qr.size),
                  height: px(CARD_LAYOUT.qr.size),
                }}
              />
            )}
          </div>

          {/* Nome */}
          <div
            className="absolute whitespace-nowrap font-bold"
            style={{
              left: px(CARD_LAYOUT.textX),
              top: px(baselineTop(CARD_LAYOUT.nome.baseline, CARD_LAYOUT.nome.size)),
              fontSize: px(CARD_LAYOUT.nome.size * PT),
              lineHeight: 1,
              color: CARD_LAYOUT.nome.color,
            }}
          >
            {nome}
          </div>

          {/* Cargo */}
          <div
            className="absolute whitespace-nowrap italic"
            style={{
              left: px(CARD_LAYOUT.textX),
              top: px(baselineTop(CARD_LAYOUT.cargo.baseline, CARD_LAYOUT.cargo.size)),
              fontSize: px(CARD_LAYOUT.cargo.size * PT),
              lineHeight: 1,
              color: CARD_LAYOUT.cargo.color,
            }}
          >
            {card.cargo}
          </div>

          {/* Logo + site */}
          <img
            src={DEFAULT_PRINT_ASSETS.logoUrl}
            alt="Logo"
            className="absolute"
            style={{
              left: px(CARD_LAYOUT.textX),
              top: px(CARD_LAYOUT.logo.bottom - CARD_LAYOUT.logo.height),
              height: px(CARD_LAYOUT.logo.height),
              width: "auto",
            }}
          />
          <div
            className="absolute whitespace-nowrap italic"
            style={{
              left: px(CARD_LAYOUT.textX + CARD_LAYOUT.logo.height * 5.1 + CARD_LAYOUT.site.gap),
              top: px(baselineTop(CARD_LAYOUT.site.baseline, CARD_LAYOUT.site.size)),
              fontSize: px(CARD_LAYOUT.site.size * PT),
              lineHeight: 1,
              color: CARD_LAYOUT.site.color,
            }}
          >
            {siteText}
          </div>
        </>
      ) : (
        <img
          src={DEFAULT_PRINT_ASSETS.logoUrl}
          alt="Logo"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: px(backLogoW), height: "auto" }}
        />
      )}
    </div>
  );
}
