import type { Collaborator, ThemeConfig } from "@/lib/types";
import logoUrl from "@/assets/logo-conexao.png";
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
  if (theme.background.mode === "solid") return { background: theme.background.solid };
  return {
    background: `linear-gradient(${theme.background.gradientAngle}deg, ${theme.background.gradientFrom}, ${theme.background.gradientTo})`,
  };
}

function CtaButton({
  href,
  Icon,
  label,
  theme,
  external,
}: {
  href: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  theme: ThemeConfig;
  external?: boolean;
}) {
  return (
    <a
      href={href}
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
  const waNumber = collaborator.whatsapp.replace(/\D/g, "");
  const telNumber = collaborator.telefone_fixo?.replace(/\D/g, "");
  const inst = theme.institucional;

  return (
    <div className="flex min-h-screen w-full justify-center" style={bgStyle(theme)}>
      <div className="flex w-full max-w-md flex-col px-5 pb-6 pt-10">
        {/* Avatar */}
        <div className="flex justify-center">
          <div
            className="grid size-36 place-items-center overflow-hidden rounded-full border-4"
            style={{ borderColor: theme.icons.bgColor }}
          >
            {collaborator.foto_url ? (
              <img
                src={collaborator.foto_url}
                alt={collaborator.nome}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white/80">
                {collaborator.nome.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Identity */}
        <h1
          className="mt-5 text-center text-2xl font-bold leading-tight"
          style={{
            fontFamily: theme.typography.nome.font,
            color: theme.typography.nome.color,
          }}
        >
          {collaborator.nome}
        </h1>
        <p
          className="mt-1 text-center text-sm"
          style={{
            fontFamily: theme.typography.cargo.font,
            color: theme.typography.cargo.color,
          }}
        >
          {collaborator.cargo}
        </p>

        {/* CTAs */}
        <div className="mt-8 space-y-3">
          {waNumber && (
            <CtaButton
              href={`https://wa.me/${waNumber}`}
              Icon={MessageCircle}
              label={`WhatsApp · ${collaborator.whatsapp}`}
              theme={theme}
              external
            />
          )}
          {collaborator.email && (
            <CtaButton
              href={`mailto:${collaborator.email}`}
              Icon={Mail}
              label={collaborator.email}
              theme={theme}
            />
          )}
          {telNumber && (
            <CtaButton
              href={`tel:${telNumber}`}
              Icon={Phone}
              label={`Telefone · ${collaborator.telefone_fixo}`}
              theme={theme}
            />
          )}
          {inst.site && (
            <CtaButton href={inst.site} Icon={Globe} label="Site institucional" theme={theme} external />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-10 flex flex-col items-start gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoUrl} alt="Conexão" className="h-8 w-auto shrink-0" />
            <div className="min-w-0 text-xs leading-tight" style={{
              fontFamily: theme.typography.institucional.font,
              color: theme.typography.institucional.color,
            }}>
              <div className="font-semibold">{inst.nomeEmpresa}</div>
              <div className="truncate">{inst.endereco}</div>
            </div>
          </div>
          <div className="flex shrink-0 gap-3">
            {inst.instagram && (
              <a href={inst.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={20} color={theme.typography.institucional.color} />
              </a>
            )}
            {inst.linkedin && (
              <a href={inst.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin size={20} color={theme.typography.institucional.color} />
              </a>
            )}
            {inst.facebook && (
              <a href={inst.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook size={20} color={theme.typography.institucional.color} />
              </a>
            )}
            {inst.youtube && (
              <a href={inst.youtube} target="_blank" rel="noreferrer" aria-label="YouTube">
                <Youtube size={20} color={theme.typography.institucional.color} />
              </a>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
