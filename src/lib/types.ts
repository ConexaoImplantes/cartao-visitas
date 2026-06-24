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

export interface ThemeConfig {
  background: {
    mode: "solid" | "gradient";
    solid: string;
    gradientFrom: string;
    gradientTo: string;
    gradientAngle: number;
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
    instagram: string;
    linkedin: string;
    facebook: string;
    youtube: string;
  };
}

export const DEFAULT_THEME: ThemeConfig = {
  background: {
    mode: "gradient",
    solid: "#0f172a",
    gradientFrom: "#0f172a",
    gradientTo: "#1e293b",
    gradientAngle: 160,
  },
  icons: { pack: "lucide", pathColor: "#0f172a", bgColor: "#c9a655" },
  typography: {
    nome: { font: "Playfair Display", color: "#f8fafc" },
    cargo: { font: "Inter", color: "#c9a655" },
    contato: { font: "Inter", color: "#f8fafc" },
    institucional: { font: "Inter", color: "#94a3b8" },
  },
  institucional: {
    nomeEmpresa: "Conexão Implantes",
    endereco: "Av. Principal, 1000 - São Paulo, SP",
    site: "https://www.conexao.com.br",
    instagram: "https://instagram.com/conexaoimplantes",
    linkedin: "https://linkedin.com/company/conexaoimplantes",
    facebook: "https://facebook.com/conexaoimplantes",
    youtube: "https://youtube.com/@conexaoimplantes",
  },
};

export const FONT_OPTIONS = [
  "Inter",
  "Playfair Display",
  "Georgia",
  "system-ui",
  "Helvetica",
] as const;
