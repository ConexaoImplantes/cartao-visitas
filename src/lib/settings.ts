import { supabase } from "@/integrations/supabase/client";

export type SlugMode = "auto" | "manual";

export interface AppSettings {
  publico: {
    /** Domínio usado ao gerar links e QR Codes. Vazio = domínio atual do navegador. */
    baseUrl: string;
    /** Palavras extras que não podem ser usadas como apelido de link. */
    reservedSlugs: string[];
  };
  cadastro: {
    ddiPadrao: string;
    dddPadrao: string;
    statusPadrao: "ativo" | "inativo";
    slugMode: SlugMode;
  };
  marca: {
    nomeSistema: string;
    logoUrl: string;
    metaTitle: string;
    metaDescription: string;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  publico: { baseUrl: "", reservedSlugs: [] },
  cadastro: { ddiPadrao: "55", dddPadrao: "", statusPadrao: "ativo", slugMode: "auto" },
  marca: {
    nomeSistema: "Link Tree Corporativo",
    logoUrl: "",
    metaTitle: "",
    metaDescription: "",
  },
};

export function normalizeSettings(raw: unknown): AppSettings {
  const r = (raw ?? {}) as Partial<AppSettings>;
  return {
    publico: { ...DEFAULT_SETTINGS.publico, ...(r.publico ?? {}) },
    cadastro: { ...DEFAULT_SETTINGS.cadastro, ...(r.cadastro ?? {}) },
    marca: { ...DEFAULT_SETTINGS.marca, ...(r.marca ?? {}) },
  };
}

/** Cache em memória para que geradores de link/QR usem o domínio configurado. */
let cachedBaseUrl = "";
let cachedSettings: AppSettings = DEFAULT_SETTINGS;

/** Configurações já carregadas (padrões enquanto o fetch não conclui). */
export function getCachedSettings(): AppSettings {
  return cachedSettings;
}

export function getPublicBaseUrl(): string {
  if (cachedBaseUrl) return cachedBaseUrl;
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function setPublicBaseUrl(url: string) {
  cachedBaseUrl = normalizeBaseUrl(url);
}

export function normalizeBaseUrl(url: string): string {
  const v = (url ?? "").trim().replace(/\/+$/, "");
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export async function fetchSettings(): Promise<AppSettings> {
  const { data } = await supabase.from("app_settings").select("config").eq("id", "global").maybeSingle();
  const settings = normalizeSettings(data?.config);
  cachedSettings = settings;
  setPublicBaseUrl(settings.publico.baseUrl);
  return settings;
}

export async function saveSettings(settings: AppSettings) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ id: "global", config: settings as never, updated_by: auth.user?.id ?? null });
  if (!error) {
    cachedSettings = settings;
    setPublicBaseUrl(settings.publico.baseUrl);
  }
  return error;
}
