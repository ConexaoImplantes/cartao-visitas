import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_THEME, FONT_OPTIONS, type ThemeConfig, type Collaborator } from "@/lib/types";
import { LinkTreeCard } from "@/components/link-tree-card";

export const Route = createFileRoute("/_authenticated/cartao/tema")({
  component: ThemePage,
});

const SAMPLE: Collaborator = {
  id: "preview",
  nome: "Ana Carolina Silva",
  cargo: "Consultora Comercial",
  email: "ana.silva@conexao.com.br",
  whatsapp: "+55 11 99999-0000",
  telefone_fixo: "+55 11 3000-0000",
  foto_url: null,
  status: "ativo",
  created_at: "",
  updated_at: "",
};

export function ThemePage() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("theme_config")
      .select("config")
      .eq("id", "global")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar tema");
        if (data?.config) setTheme(data.config as unknown as ThemeConfig);
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("theme_config")
      .upsert({ id: "global", config: theme as any, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast.error("Falha ao salvar", { description: error.message });
      return;
    }
    toast.success("Tema salvo");
  }

  function patch<K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) {
    setTheme((p) => ({ ...p, [key]: value }));
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-[color:var(--text-muted)]"><Loader2 className="mr-2 size-4 animate-spin" />Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">Personalização Global</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Ajuste cores, fontes e ícones — válido para todos os Link Trees.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="shrink-0 gradient-accent text-[color:var(--text-inverted)] hover:opacity-90">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
        {/* Editor */}
        <div className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
          <Tabs defaultValue="background">
            <TabsList className="grid w-full grid-cols-4 bg-[color:var(--surface-hover)]">
              <TabsTrigger value="background">Fundo</TabsTrigger>
              <TabsTrigger value="icons">Ícones</TabsTrigger>
              <TabsTrigger value="typography">Tipografia</TabsTrigger>
              <TabsTrigger value="institucional">Instituição</TabsTrigger>
            </TabsList>

            <TabsContent value="background" className="space-y-4 pt-5">
              <div className="flex gap-2">
                {(["solid", "gradient"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => patch("background", { ...theme.background, mode: m })}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      theme.background.mode === m
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text-main)]"
                        : "border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {m === "solid" ? "Sólido" : "Gradiente"}
                  </button>
                ))}
              </div>
              {theme.background.mode === "solid" ? (
                <ColorRow label="Cor de fundo" value={theme.background.solid}
                  onChange={(v) => patch("background", { ...theme.background, solid: v })} />
              ) : (
                <>
                  <ColorRow label="Gradiente — início" value={theme.background.gradientFrom}
                    onChange={(v) => patch("background", { ...theme.background, gradientFrom: v })} />
                  <ColorRow label="Gradiente — fim" value={theme.background.gradientTo}
                    onChange={(v) => patch("background", { ...theme.background, gradientTo: v })} />
                  <div className="space-y-1.5">
                    <Label>Ângulo: {theme.background.gradientAngle}°</Label>
                    <input
                      type="range" min={0} max={360}
                      value={theme.background.gradientAngle}
                      onChange={(e) => patch("background", { ...theme.background, gradientAngle: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="icons" className="space-y-4 pt-5">
              <ColorRow label="Cor do ícone" value={theme.icons.pathColor}
                onChange={(v) => patch("icons", { ...theme.icons, pathColor: v })} />
              <ColorRow label="Cor de fundo do círculo" value={theme.icons.bgColor}
                onChange={(v) => patch("icons", { ...theme.icons, bgColor: v })} />
            </TabsContent>

            <TabsContent value="typography" className="space-y-4 pt-5">
              {(["nome", "cargo", "contato", "institucional"] as const).map((k) => (
                <div key={k} className="grid grid-cols-1 gap-3 rounded-lg border border-[color:var(--border-strong)] p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1.5">
                    <Label className="capitalize">{k}</Label>
                    <select
                      value={theme.typography[k].font}
                      onChange={(e) => patch("typography", { ...theme.typography, [k]: { ...theme.typography[k], font: e.target.value } })}
                      className="h-9 w-full rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface-hover)] px-2 text-sm"
                    >
                      {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <ColorRow inline label="Cor" value={theme.typography[k].color}
                    onChange={(v) => patch("typography", { ...theme.typography, [k]: { ...theme.typography[k], color: v } })} />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="institucional" className="space-y-3 pt-5">
              {(["nomeEmpresa", "endereco", "site", "instagram", "linkedin", "facebook", "youtube"] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label className="capitalize">{k}</Label>
                  <Input
                    value={theme.institucional[k]}
                    onChange={(e) => patch("institucional", { ...theme.institucional, [k]: e.target.value })}
                  />
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-[2rem] border-[10px] border-[color:var(--surface-hover)] shadow-2xl">
            <div className="h-[720px] w-full overflow-y-auto" style={{ maxWidth: 370 }}>
              <LinkTreeCard collaborator={SAMPLE} theme={theme} />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-[color:var(--text-muted)]">Preview em tempo real</p>
        </div>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  inline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "space-y-1.5" : "space-y-1.5"}>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-[color:var(--border-strong)] bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}
