import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Fallback de recorte via remove.bg (plano gratuito: 50 chamadas/mês, saída em prévia
 * de ~0,25 MP). Usado apenas quando o recorte local (IA no navegador) não satisfaz.
 * Recebe e devolve data URL PNG.
 */
export const removeBgRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { dataUrl: string }) => {
    if (!data?.dataUrl?.startsWith("data:image/")) throw new Error("Imagem inválida");
    return data;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["REMOVE_BG_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, error: "Serviço de recorte alternativo não configurado." };
    }

    const base64 = data.dataUrl.split(",")[1] ?? "";
    const body = new URLSearchParams({
      image_file_b64: base64,
      size: "preview",
      format: "png",
    });

    let res: Response;
    try {
      res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch {
      return { ok: false as const, error: "Não foi possível contatar o serviço de recorte." };
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("remove.bg falhou", res.status, detail.slice(0, 400));
      if (res.status === 402)
        return { ok: false as const, error: "Cota gratuita da remove.bg esgotada neste mês." };
      if (res.status === 403)
        return { ok: false as const, error: "Chave da remove.bg inválida ou sem permissão." };
      if (res.status === 429)
        return { ok: false as const, error: "Muitas requisições. Tente novamente em instantes." };
      return { ok: false as const, error: "O serviço de recorte não conseguiu processar a imagem." };
    }

    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    const credits = res.headers.get("x-credits-charged");
    return {
      ok: true as const,
      dataUrl: `data:image/png;base64,${btoa(binary)}`,
      credits: credits ? Number(credits) : 0,
    };
  });
