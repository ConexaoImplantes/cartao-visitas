import { supabase } from "@/integrations/supabase/client";

export type CardEventType =
  | "view"
  | "whatsapp"
  | "email"
  | "telefone"
  | "rede_social"
  | "kit_view";

export interface CardStats {
  collaborator_id: string;
  views: number;
  clicks: number;
  whatsapp: number;
  email: number;
  telefone: number;
  rede_social: number;
  kit_views?: number;
}

function deviceKind(): string {
  if (typeof navigator === "undefined") return "desconhecido";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Registra um evento sem nunca bloquear a navegação do visitante. */
export async function trackEvent(params: {
  collaboratorId: string;
  slug: string;
  type: CardEventType;
  target?: string;
}) {
  try {
    await supabase.from("card_events").insert({
      collaborator_id: params.collaboratorId,
      slug: params.slug,
      event_type: params.type,
      target: params.target ?? null,
      referrer: typeof document !== "undefined" ? document.referrer.slice(0, 300) || null : null,
      user_agent_kind: deviceKind(),
    });
  } catch {
    /* métricas nunca interrompem o usuário */
  }
}

/** Registra uma visita apenas uma vez por sessão do navegador. */
export async function trackView(collaboratorId: string, slug: string) {
  const key = `cev:${slug}`;
  try {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    }
  } catch {
    /* modo privado pode bloquear */
  }
  await trackEvent({ collaboratorId, slug, type: "view" });
}

export function trackClick(
  collaboratorId: string,
  slug: string,
  type: Exclude<CardEventType, "view">,
  target?: string,
) {
  void trackEvent({ collaboratorId, slug, type, target });
}

export function sinceFromDays(days: number | null): string | null {
  if (!days) return null;
  return new Date(Date.now() - days * 86400000).toISOString();
}

/** Busca contagens agregadas por colaborador. */
export async function fetchCardStats(days: number | null): Promise<Record<string, CardStats>> {
  const { data, error } = await supabase.rpc("card_event_stats", {
    _since: sinceFromDays(days) ?? undefined,
  });
  if (error || !data) return {};
  const map: Record<string, CardStats> = {};
  for (const row of data as unknown as CardStats[]) {
    if (row.collaborator_id) map[row.collaborator_id] = row;
  }
  return map;
}
