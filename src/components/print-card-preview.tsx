import { useEffect, useState } from "react";
import {
  CARD_LAYOUT,
  CARD_LAYOUT_ANTIGO,
  CARD_TRIM,
  DEFAULT_PRINT_ASSETS,
  formatPhoneAntigo,
  marcaGeometry,
  type CardModelo,
  type PrintCardInput,
} from "@/lib/print-card";
import { buildCardUrl } from "@/lib/qr";
import fontRegularAsset from "@/assets/OpenSans-Regular.ttf.asset.json";
import fontBoldAsset from "@/assets/OpenSans-Bold.ttf.asset.json";
import fontItalicAsset from "@/assets/OpenSans-Italic.ttf.asset.json";
import fontFrutigerAsset from "@/assets/FrutigerLTStd-LightCn.otf.asset.json";

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
    new FontFace("FrutigerPreview", `url(${fontFrutigerAsset.url})`).load(),
  ])
    .then((faces) => {
      faces.forEach((f) => (document as any).fonts.add(f));
    })
    .catch(() => {});
  return fontsPromise;
}

export interface PrintCardPreviewProps {
  card: PrintCardInput;
  modelo?: CardModelo;
  frenteUrl?: string;
  versoUrl?: string;
  antigoFrenteUrl?: string;
  antigoVersoUrl?: string;
  site?: string;
  /** distance (mm) from the card top to the top of the logo + site block */
  marcaTop?: number;
  /** logo height (mm) */
  marcaLogoAltura?: number;
  /** Pixels per millimetre (preview resolution). */
  scale?: number;
  side?: "frente" | "verso";
}

export function PrintCardPreview({
  card,
  modelo = "novo",
  frenteUrl,
  versoUrl,
  antigoFrenteUrl,
  antigoVersoUrl,
  site,
  marcaTop,
  marcaLogoAltura,
  scale = 5,
  side = "frente",
}: PrintCardPreviewProps) {
  const marca = marcaGeometry(marcaTop, marcaLogoAltura);
  const [qr, setQr] = useState<string | null>(null);
  const [, setFontsReady] = useState(false);
  const isAntigo = modelo === "antigo";

  useEffect(() => {
    const p = ensureFonts();
    if (p) p.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    let alive = true;
    if (!card.slug || isAntigo) {
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
  }, [card.slug, isAntigo]);

  const px = (mm: number) => `${mm * scale}px`;
  const nome = (card.nome_cartao || card.nome || "").trim();
  const siteText = (site || "www.conexao.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const bg = isAntigo
    ? side === "frente"
      ? antigoFrenteUrl || DEFAULT_PRINT_ASSETS.antigoFrenteUrl
      : antigoVersoUrl || DEFAULT_PRINT_ASSETS.antigoVersoUrl
    : side === "frente"
      ? frenteUrl || DEFAULT_PRINT_ASSETS.frenteUrl
      : versoUrl || DEFAULT_PRINT_ASSETS.versoUrl;

  const baselineTop = (baselineMm: number, sizePt: number) =>
    baselineMm - sizePt * PT * ASCENT;

  const backLogoW = CARD_LAYOUT.backLogoWidth;

  const antigoLine = (
    text: string,
    x: number,
    baseline: number,
    size: number,
    color: string,
    opacity = 1,
  ) => (
    <div
      className="absolute whitespace-nowrap"
      style={{
        left: px(x),
        top: px(baselineTop(baseline, size)),
        fontSize: px(size * PT),
        lineHeight: 1,
        color,
        opacity,
      }}
    >
      {text}
    </div>
  );

  return (
    <div
      className="relative overflow-hidden rounded-[2px] shadow-lg ring-1 ring-black/10"
      style={{
        width: px(CARD_TRIM.w),
        height: px(CARD_TRIM.h),
        fontFamily: isAntigo
          ? "FrutigerPreview, system-ui, sans-serif"
          : "OpenSansPreview, system-ui, sans-serif",
      }}
    >
      <img
        src={bg}
        alt=""
        className="absolute inset-0 h-full w-full object-fill"
        draggable={false}
      />

      {isAntigo ? (
        side === "frente" && (
          <>
            {antigoLine(
              nome,
              CARD_LAYOUT_ANTIGO.textX,
              CARD_LAYOUT_ANTIGO.nome.baseline,
              CARD_LAYOUT_ANTIGO.nome.size,
              CARD_LAYOUT_ANTIGO.nome.color,
            )}
            {antigoLine(
              card.cargo,
              CARD_LAYOUT_ANTIGO.textX,
              CARD_LAYOUT_ANTIGO.cargo.baseline,
              CARD_LAYOUT_ANTIGO.cargo.size,
              CARD_LAYOUT_ANTIGO.cargo.color,
            )}
            {antigoLine(
              card.email ?? "",
              CARD_LAYOUT_ANTIGO.textX,
              CARD_LAYOUT_ANTIGO.email.baseline,
              CARD_LAYOUT_ANTIGO.email.size,
              CARD_LAYOUT_ANTIGO.email.color,
              CARD_LAYOUT_ANTIGO.email.opacity,
            )}
            {antigoLine(
              siteText,
              CARD_LAYOUT_ANTIGO.textX,
              CARD_LAYOUT_ANTIGO.site.baseline,
              CARD_LAYOUT_ANTIGO.site.size,
              CARD_LAYOUT_ANTIGO.site.color,
              CARD_LAYOUT_ANTIGO.site.opacity,
            )}
            {antigoLine(
              formatPhoneAntigo(card.whatsapp),
              CARD_LAYOUT_ANTIGO.celular.x,
              CARD_LAYOUT_ANTIGO.celular.baseline,
              CARD_LAYOUT_ANTIGO.celular.size,
              CARD_LAYOUT_ANTIGO.celular.color,
              CARD_LAYOUT_ANTIGO.celular.opacity,
            )}
          </>
        )
      ) : side === "frente" ? (
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

          {/* Nome — Open Sans Bold 11pt #FFFFFF (tamanho fixo) */}
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

          {/* Bloco marca: logo + site alinhados horizontalmente */}
          <div
            className="absolute flex items-center"
            style={{
              left: px(CARD_LAYOUT.textX),
              top: px(marca.logoTop),
              height: px(marca.logoHeight),
              gap: px(CARD_LAYOUT.site.gap),
            }}
          >
            <img
              src={DEFAULT_PRINT_ASSETS.logoUrl}
              alt="Logo"
              style={{ height: px(marca.logoHeight), width: "auto" }}
            />
            <span
              className="whitespace-nowrap italic"
              style={{
                fontSize: px(CARD_LAYOUT.site.size * PT),
                lineHeight: 1,
                color: CARD_LAYOUT.site.color,
              }}
            >
              {siteText}
            </span>
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
