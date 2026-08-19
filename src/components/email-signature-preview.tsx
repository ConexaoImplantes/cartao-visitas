import { useEffect, useState } from "react";
import {
  DEFAULT_SIGNATURE_ASSETS,
  PT_MM,
  SIGN_LAYOUT,
  SIGN_TRIM,
  ensureSignatureFonts,
  signatureCelular,
  signatureNome,
  type SignatureInput,
} from "@/lib/email-signature";
import { buildCardUrl } from "@/lib/qr";

/** Ascendente aproximada usada para converter a baseline em offset CSS. */
const ASCENT = 0.765;

export interface EmailSignaturePreviewProps {
  card: SignatureInput;
  bgUrl?: string;
  /** Pixels por milímetro. */
  scale?: number;
}

export function EmailSignaturePreview({ card, bgUrl, scale = 3 }: EmailSignaturePreviewProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [, setFontsReady] = useState(false);

  useEffect(() => {
    ensureSignatureFonts().then(() => setFontsReady(true));
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
  const top = (baselineMm: number, sizePt: number) => baselineMm - sizePt * PT_MM * ASCENT;
  const celular = signatureCelular(card.whatsapp);

  return (
    <div
      className="relative overflow-hidden rounded-[2px] shadow-lg ring-1 ring-black/10"
      style={{
        width: px(SIGN_TRIM.w),
        height: px(SIGN_TRIM.h),
        fontFamily: "SignOpenSans, system-ui, sans-serif",
      }}
    >
      <img
        src={bgUrl || DEFAULT_SIGNATURE_ASSETS.bgUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-fill"
        draggable={false}
      />

      {/* Nome */}
      <div
        className="absolute whitespace-nowrap font-bold"
        style={{
          left: px(SIGN_LAYOUT.nome.x),
          top: px(top(SIGN_LAYOUT.nome.baseline, SIGN_LAYOUT.nome.size)),
          fontSize: px(SIGN_LAYOUT.nome.size * PT_MM),
          lineHeight: 1,
          color: SIGN_LAYOUT.nome.color,
        }}
      >
        {signatureNome(card)}
      </div>

      {/* Cargo */}
      <div
        className="absolute whitespace-nowrap italic"
        style={{
          left: px(SIGN_LAYOUT.cargo.x),
          top: px(top(SIGN_LAYOUT.cargo.baseline, SIGN_LAYOUT.cargo.size)),
          fontSize: px(SIGN_LAYOUT.cargo.size * PT_MM),
          lineHeight: 1,
          color: SIGN_LAYOUT.cargo.color,
        }}
      >
        {card.cargo}
      </div>

      {/* Celular */}
      <div
        className="absolute whitespace-nowrap"
        style={{
          left: px(SIGN_LAYOUT.celular.x),
          top: px(top(SIGN_LAYOUT.celular.baseline, SIGN_LAYOUT.celular.size)),
          fontFamily: "SignArimo, Arial, sans-serif",
          fontSize: px(SIGN_LAYOUT.celular.size * PT_MM),
          lineHeight: 1,
          color: SIGN_LAYOUT.celular.color,
        }}
      >
        {celular}
      </div>

      {/* E-mail */}
      <div
        className="absolute whitespace-nowrap"
        style={{
          left: px(SIGN_LAYOUT.email.x),
          top: px(top(SIGN_LAYOUT.email.baseline, SIGN_LAYOUT.email.size)),
          fontFamily: "SignArimo, Arial, sans-serif",
          fontSize: px(SIGN_LAYOUT.email.size * PT_MM),
          lineHeight: 1,
          color: SIGN_LAYOUT.email.color,
        }}
      >
        {card.email}
      </div>

      {/* QR Code */}
      <div
        className="absolute bg-white"
        style={{
          left: px(SIGN_LAYOUT.qr.x),
          top: px(SIGN_LAYOUT.qr.top),
          width: px(SIGN_LAYOUT.qr.size),
          height: px(SIGN_LAYOUT.qr.size),
        }}
      >
        {qr && <img src={qr} alt="QR Code" className="h-full w-full" />}
      </div>
    </div>
  );
}
