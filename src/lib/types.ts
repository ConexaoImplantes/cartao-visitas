export type CollaboratorStatus = "ativo" | "inativo";

export interface Collaborator {
  id: string;
  nome: string;
  cargo: string;
  email: string;
  whatsapp: string;
  telefone_fixo: string | null;
  foto_url: string | null;
  status: CollaboratorStatus;
  created_at: string;
  updated_at: string;
}

export type BlobPosition =
  | "tl" | "tc" | "tr"
  | "ml" | "mc" | "mr"
  | "bl" | "bc" | "br";

export interface BlobItem {
  enabled: boolean;
  color: string;
  position: BlobPosition;
  size: number; // px
  opacity: number; // 0..1
}

export type BackgroundMode = "solid" | "gradient2" | "gradient3";

export interface ThemeConfig {
  background: {
    mode: BackgroundMode;
    solid: string;
    gradientFrom: string;
    gradientTo: string;
    gradientAngle: number;
    // 3-color gradient
    gradient3From: string;
    gradient3Mid: string;
    gradient3To: string;
    gradient3Angle: number;
    blobsEnabled: boolean;
    blobs: BlobItem[];
  };
  icons: {
    pack: "lucide" | "filled" | "outline";
    pathColor: string;
    bgColor: string;
  };
  typography: {
    nome: { font: string; color: string };
    cargo: { font: string; color: string };
    contato: { font: string; color: string };
    institucional: { font: string; color: string };
  };
  institucional: {
    nomeEmpresa: string;
    endereco: string;
    site: string;
    logoUrl: string;
    logoWidth: number;
    logoHeight: number;
    instagram: string;
    linkedin: string;
    facebook: string;
    youtube: string;
    instagramEnabled: boolean;
    linkedinEnabled: boolean;
    facebookEnabled: boolean;
    youtubeEnabled: boolean;
    socialColors: {
      instagram: string;
      linkedin: string;
      facebook: string;
      youtube: string;
    };
    socialIconSize: number;
  };
}

export const BLOB_POSITIONS: { value: BlobPosition; label: string }[] = [
  { value: "tl", label: "Sup. esquerdo" },
  { value: "tc", label: "Sup. central" },
  { value: "tr", label: "Sup. direito" },
  { value: "ml", label: "Esquerdo" },
  { value: "mc", label: "Centro" },
  { value: "mr", label: "Direito" },
  { value: "bl", label: "Inf. esquerdo" },
  { value: "bc", label: "Inf. central" },
  { value: "br", label: "Inf. direito" },
];

export const DEFAULT_THEME: ThemeConfig = {
  background: {
    mode: "gradient2",
    solid: "#0f172a",
    gradientFrom: "#0f172a",
    gradientTo: "#1e293b",
    gradientAngle: 160,
    gradient3From: "#0f172a",
    gradient3Mid: "#1e293b",
    gradient3To: "#0f172a",
    gradient3Angle: 160,
    blobsEnabled: false,
    blobs: [
      { enabled: true, color: "#c9a655", position: "tr", size: 320, opacity: 0.35 },
      { enabled: true, color: "#3b82f6", position: "bl", size: 280, opacity: 0.25 },
    ],
  },
  icons: { pack: "lucide", pathColor: "#0f172a", bgColor: "#c9a655" },
  typography: {
    nome: { font: "Outfit", color: "#f8fafc" },
    cargo: { font: "Outfit", color: "#c9a655" },
    contato: { font: "Outfit", color: "#f8fafc" },
    institucional: { font: "Outfit", color: "#94a3b8" },
  },
  institucional: {
    nomeEmpresa: "Conexão Implantes",
    endereco: "Av. Principal, 1000 - São Paulo, SP",
    site: "https://www.conexao.com.br",
    logoUrl: "",
    logoWidth: 120,
    logoHeight: 32,
    instagram: "https://instagram.com/conexaoimplantes",
    linkedin: "https://linkedin.com/company/conexaoimplantes",
    facebook: "https://facebook.com/conexaoimplantes",
    youtube: "https://youtube.com/@conexaoimplantes",
    instagramEnabled: true,
    linkedinEnabled: true,
    facebookEnabled: true,
    youtubeEnabled: true,
    socialColors: {
      instagram: "#E1306C",
      linkedin: "#0A66C2",
      facebook: "#1877F2",
      youtube: "#FF0000",
    },
    socialIconSize: 20,
  },
};

export const FONT_OPTIONS = [
  "Outfit",
  "Inter",
  "Playfair Display",
  "Georgia",
  "system-ui",
  "Helvetica",
] as const;

/** Merge persisted (possibly partial / legacy) theme with defaults. */
export function normalizeTheme(input: unknown): ThemeConfig {
  const t = (input ?? {}) as Partial<ThemeConfig>;
  return {
    ...DEFAULT_THEME,
    ...t,
    background: { ...DEFAULT_THEME.background, ...(t.background ?? {}) },
    icons: { ...DEFAULT_THEME.icons, ...(t.icons ?? {}) },
    typography: {
      nome: { ...DEFAULT_THEME.typography.nome, ...(t.typography?.nome ?? {}) },
      cargo: { ...DEFAULT_THEME.typography.cargo, ...(t.typography?.cargo ?? {}) },
      contato: { ...DEFAULT_THEME.typography.contato, ...(t.typography?.contato ?? {}) },
      institucional: { ...DEFAULT_THEME.typography.institucional, ...(t.typography?.institucional ?? {}) },
    },
    institucional: {
      ...DEFAULT_THEME.institucional,
      ...(t.institucional ?? {}),
      socialColors: {
        ...DEFAULT_THEME.institucional.socialColors,
        ...((t.institucional as any)?.socialColors ?? {}),
      },
    },
  };
}

/** Brazilian-style phone mask: +55 (11) 99999-9999 / (11) 3000-0000 */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 11) {
    const cc = d.slice(0, d.length - 11);
    const ar = d.slice(-11, -9);
    const p1 = d.slice(-9, -4);
    const p2 = d.slice(-4);
    return `+${cc} (${ar}) ${p1}-${p2}`;
  }
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length > 6) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return d;
}

/** Mask the "subscriber" portion only (no DDI/DDD): 99999-9999 / 3000-0000 */
export function maskNumberOnly(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, d.length - 4)}-${d.slice(-4)}`;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Phone parts stored as a single text column: "DDI|DDD|NUMBER". */
export interface PhoneParts { ddi: string; ddd: string; number: string }
export function encodePhone(p: PhoneParts): string {
  if (!p.ddi && !p.ddd && !p.number) return "";
  return `${p.ddi}|${p.ddd}|${p.number}`;
}
export function decodePhone(raw: string | null | undefined): PhoneParts {
  if (!raw) return { ddi: "", ddd: "", number: "" };
  if (raw.includes("|")) {
    const [ddi = "", ddd = "", number = ""] = raw.split("|");
    return { ddi: ddi.replace(/\D/g, ""), ddd: ddd.replace(/\D/g, ""), number: number.replace(/\D/g, "") };
  }
  // Legacy free-form string: try to split last 8-9 digits as number, prev 2 as DDD, rest DDI.
  const d = raw.replace(/\D/g, "");
  if (!d) return { ddi: "", ddd: "", number: "" };
  if (d.length >= 10) {
    const number = d.slice(-9).length === 9 && d.length >= 11 ? d.slice(-9) : d.slice(-8);
    const rest = d.slice(0, d.length - number.length);
    const ddd = rest.slice(-2);
    const ddi = rest.slice(0, -2);
    return { ddi, ddd, number };
  }
  return { ddi: "", ddd: "", number: d };
}
export function formatPhoneDisplay(raw: string | null | undefined): string {
  const { ddi, ddd, number } = decodePhone(raw);
  if (!ddi && !ddd && !number) return "";
  const n = maskNumberOnly(number) || number;
  const parts: string[] = [];
  if (ddi) parts.push(`+${ddi}`);
  if (ddd) parts.push(`(${ddd})`);
  if (n) parts.push(n);
  return parts.join(" ");
}
export function phoneDigits(raw: string | null | undefined): string {
  const { ddi, ddd, number } = decodePhone(raw);
  return `${ddi}${ddd}${number}`;
}

/** Telefone fixo also supports a "ramal" mode, encoded as "R|<digits>". */
export type TelefoneKind = "fixo" | "ramal";
export interface TelefoneValue { kind: TelefoneKind; phone: PhoneParts; ramal: string }
export function encodeTelefone(v: TelefoneValue): string {
  if (v.kind === "ramal") return v.ramal ? `R|${v.ramal.replace(/\D/g, "")}` : "";
  return encodePhone(v.phone);
}
export function decodeTelefone(raw: string | null | undefined): TelefoneValue {
  if (raw && raw.startsWith("R|")) {
    return { kind: "ramal", ramal: raw.slice(2).replace(/\D/g, ""), phone: { ddi: "", ddd: "", number: "" } };
  }
  return { kind: "fixo", ramal: "", phone: decodePhone(raw) };
}
