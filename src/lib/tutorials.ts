import rawTutorials from "@/data/tutoriais.json";
import type { PermissionKey } from "@/lib/permissions";

export interface TutorialStep {
  titulo: string;
  texto: string;
  rota?: string;
  alvo?: string;
  clique?: string;
  imagem?: string;
}

export interface Tutorial {
  id: string;
  titulo: string;
  descricao: string;
  area: string;
  rota: string;
  permissao?: PermissionKey;
  soSuperAdmin?: boolean;
  passos: TutorialStep[];
  video?: string;
  capa?: string;
}

const imageModules = import.meta.glob("@/assets/tutoriais/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const videoModules = import.meta.glob("@/assets/tutoriais/*.mp4", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findAsset(modules: Record<string, string>, fileName: string): string | undefined {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${fileName}`));
  return entry?.[1];
}

export const TUTORIALS: Tutorial[] = (rawTutorials as Tutorial[]).map((t) => {
  const passos = t.passos.map((p, i) => ({
    ...p,
    imagem: findAsset(imageModules, `${t.id}-${i + 1}.png`),
  }));
  return {
    ...t,
    passos,
    video: findAsset(videoModules, `${t.id}.mp4`),
    capa: passos.find((p) => p.imagem)?.imagem,
  };
});

export const TUTORIAL_AREAS: string[] = Array.from(new Set(TUTORIALS.map((t) => t.area)));

export function getTutorial(id: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.id === id);
}

/** ~25s de leitura por passo, arredondado para minutos. */
export function estimatedMinutes(t: Tutorial): number {
  return Math.max(1, Math.round((t.passos.length * 25) / 60));
}

const STORAGE_KEY = "tutoriais.concluidos";

export function readCompleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function writeCompleted(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignora quota/privacidade */
  }
}
