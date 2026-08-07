import type { Collaborator, ThemeConfig, BlobPosition } from "@/lib/types";
import { decodeTelefone, formatPhoneDisplay, phoneDigits, maskNumberOnly } from "@/lib/types";
import { trackClick } from "@/lib/analytics";
import defaultLogo from "@/assets/logo-conexao.png";
import {
  MessageCircle,
  Mail,
  Phone,
  Globe,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
} from "lucide-react";

interface Props {
  collaborator: Collaborator;
  theme: ThemeConfig;
}

function bgStyle(theme: ThemeConfig): React.CSSProperties {
  const b = theme.background;
  if (b.mode === "solid") return { background: b.solid };
  if (b.mode === "gradient3") {
    return {
      background: `linear-gradient(${b.gradient3Angle}deg, ${b.gradient3From}, ${b.gradient3Mid}, ${b.gradient3To})`,
    };
  }
  return {
    background: `linear-gradient(${b.gradientAngle}deg, ${b.gradientFrom}, ${b.gradientTo})`,
  };
}

const POSITION_STYLES: Record<BlobPosition, React.CSSProperties> = {
  tl: { top: "-10%", left: "-10%" },
  tc: { top: "-15%", left: "50%", transform: "translateX(-50%)" },
  tr: { top: "-10%", right: "-10%" },
  ml: { top: "50%", left: "-15%", transform: "translateY(-50%)" },
  mc: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  mr: { top: "50%", right: "-15%", transform: "translateY(-50%)" },
  bl: { bottom: "-10%", left: "-10%" },
  bc: { bottom: "-15%", left: "50%", transform: "translateX(-50%)" },
  br: { bottom: "-10%", right: "-10%" },
};

function CtaButton({
  href,
  Icon,
  label,
  theme,
  external,
  onClick,
}: {
  href: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  theme: ThemeConfig;
  external?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group flex w-full items-center gap-4 rounded-2xl bg-white/8 px-4 py-3 backdrop-blur transition hover:bg-white/12 active:scale-[0.99]"
      style={{
        fontFamily: theme.typography.contato.font,
        color: theme.typography.contato.color,
      }}
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full"
        style={{ background: theme.icons.bgColor }}
      >
        <Icon size={20} color={theme.icons.pathColor} />
      </span>
      <span className="truncate text-sm font-medium">{label}</span>
    </a>
  );
}

export function LinkTreeCard({ collaborator, theme }: Props) {
  const waDigits = phoneDigits(collaborator.whatsapp);
  const waLabel = formatPhoneDisplay(collaborator.whatsapp);
  const tel = decodeTelefone(collaborator.telefone_fixo);
  const telDigits = tel.kind === "fixo" ? phoneDigits(collaborator.telefone_fixo) : tel.ramal;
  const telLabel =
    tel.kind === "ramal"
      ? `Ramal ${maskNumberOnly(tel.ramal) || tel.ramal}`
      : formatPhoneDisplay(collaborator.telefone_fixo);
  const inst = theme.institucional;
  const logoSrc = inst.logoUrl || defaultLogo;
  const sc = inst.socialColors;

  const socials: Array<{ key: "instagram" | "linkedin" | "facebook" | "youtube"; Icon: typeof Instagram; href: string; enabled: boolean }> = [
    { key: "instagram", Icon: Instagram, href: inst.instagram, enabled: inst.instagramEnabled },
    { key: "linkedin", Icon: Linkedin, href: inst.linkedin, enabled: inst.linkedinEnabled },
    { key: "facebook", Icon: Facebook, href: inst.facebook, enabled: inst.facebookEnabled },
    { key: "youtube", Icon: Youtube, href: inst.youtube, enabled: inst.youtubeEnabled },
  ];

  return (
    <div
      className="relative flex min-h-[100svh] w-full justify-center overflow-hidden"
      style={bgStyle(theme)}
    >
      {/* Blobs layer */}
      {theme.background.blobsEnabled && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {theme.background.blobs.filter((b) => b.enabled).map((b, i) => (
            <div
              key={i}
              className="absolute rounded-full blur-3xl"
              style={{
                width: b.size,
                height: b.size,
                background: b.color,
                opacity: b.opacity,
                ...POSITION_STYLES[b.position],
              }}
            />
          ))}
        </div>
      )}

      <div
        className="relative z-10 flex w-full max-w-[440px] flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.25rem,env(safe-area-inset-top))]"
      >
        {/* Avatar */}
        <div className="flex justify-center">
          <div
            className="grid size-32 place-items-center overflow-hidden rounded-full border-4 sm:size-36"
            style={{ borderColor: theme.icons.bgColor }}
          >
            {collaborator.foto_url ? (
              <img src={collaborator.foto_url} alt={collaborator.nome} className="size-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white/80">{collaborator.nome.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Identity */}
        <h1
          className="mt-5 text-balance text-center text-[1.5rem] font-bold leading-tight"
          style={{ fontFamily: theme.typography.nome.font, color: theme.typography.nome.color }}
        >
          {collaborator.nome}
        </h1>
        <p
          className="mt-1 text-center text-sm"
          style={{ fontFamily: theme.typography.cargo.font, color: theme.typography.cargo.color }}
        >
          {collaborator.cargo}
        </p>

        {/* CTAs */}
        <div className="mt-7 space-y-3">
          {waDigits && (
            <CtaButton
              href={`https://wa.me/${waDigits}`}
              Icon={MessageCircle}
              label={waLabel}
              theme={theme}
              external
            />
          )}
          {collaborator.email && (
            <CtaButton href={`mailto:${collaborator.email}`} Icon={Mail} label={collaborator.email} theme={theme} />
          )}
          {telDigits && (
            <CtaButton
              href={tel.kind === "ramal" ? `tel:${tel.ramal}` : `tel:${telDigits}`}
              Icon={Phone}
              label={telLabel}
              theme={theme}
            />
          )}
          {inst.site && (
            <CtaButton
              href={/^https?:\/\//i.test(inst.site) ? inst.site : `https://${inst.site}`}
              Icon={Globe}
              label={inst.site}
              theme={theme}
              external
            />
          )}
        </div>


        {/* Footer */}
        <footer className="mt-10 flex items-start justify-between gap-4 border-t border-white/10 pt-6">
          <div className="flex flex-col gap-2">
            <img
              src={logoSrc}
              alt={inst.nomeEmpresa}
              className="object-contain"
              style={{ width: inst.logoWidth, height: inst.logoHeight }}
            />
            {(inst.nomeEmpresaEnabled || inst.enderecoEnabled) && (
              <div
                className="text-xs leading-tight"
                style={{ fontFamily: theme.typography.institucional.font, color: theme.typography.institucional.color }}
              >
                {inst.nomeEmpresaEnabled && <div className="font-semibold">{inst.nomeEmpresa}</div>}
                {inst.enderecoEnabled && <div>{inst.endereco}</div>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {socials.map(({ key, Icon, href, enabled }) =>
              enabled && href ? (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={key}
                  className="grid place-items-center rounded-full bg-white/8 transition active:scale-95"
                  style={{ width: inst.socialIconSize + 20, height: inst.socialIconSize + 20 }}
                >
                  <Icon size={inst.socialIconSize} color={sc[key]} />
                </a>
              ) : null,
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
