import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Save, Upload, Trash2, Plus, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { MARCA_LIMITS } from "@/lib/print-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_THEME,
  FONT_OPTIONS,
  BLOB_POSITIONS,
  normalizeTheme,
  type ThemeConfig,
  type Collaborator,
  type BackgroundMode,
  type BlobItem,
  type BlobPosition,
} from "@/lib/types";
import { LinkTreeCard } from "@/components/link-tree-card";
import { compressImageContain } from "@/lib/image-utils";
import { imageLinkToDataUrl } from "@/lib/image-link";

import { usePermissions } from "@/hooks/use-permissions";

export const Route = createFileRoute("/_authenticated/cartao/tema")({
  component: ThemePage,
});

const SAMPLE: Collaborator = {
  id: "preview",
  slug: "ana-carolina-silva",
  nome: "Ana Carolina Silva",
  cargo: "Consultora Comercial",
  email: "ana.silva@conexao.com.br",
  whatsapp: "+5511999990000",
  telefone_fixo: "1130000000",
  foto_url: null,
  status: "ativo",
  created_at: "",
  updated_at: "",
};

const BG_MODES: { value: BackgroundMode; label: string }[] = [
  { value: "solid", label: "Sólido" },
  { value: "gradient2", label: "Gradiente 2 cores" },
  { value: "gradient3", label: "Gradiente 3 cores" },
];

const SOCIAL_KEYS = ["instagram", "linkedin", "facebook", "youtube"] as const;

export function ThemePage() {
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permLoading && !can("tema.view")) {
      navigate({ to: "/cartao/dashboard", replace: true });
    }
  }, [permLoading, can, navigate]);

  useEffect(() => {
    supabase
      .from("theme_config")
      .select("config")
      .eq("id", "global")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar tema");
        setTheme(normalizeTheme(data?.config));
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
    return (
      <div className="flex items-center justify-center p-12 text-[color:var(--text-muted)]">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">Personalização Global</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">Ajuste cores, fontes e ícones — válido para todos os Link Trees.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !can("tema.edit")} className="shrink-0 gradient-accent text-[color:var(--text-inverted)] hover:opacity-90">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
        {/* Editor */}
        <div className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
          <Tabs defaultValue="background">
            <TabsList className="grid w-full grid-cols-5 bg-[color:var(--surface-hover)]">
              <TabsTrigger value="background">Fundo</TabsTrigger>
              <TabsTrigger value="icons">Ícones</TabsTrigger>
              <TabsTrigger value="typography">Tipografia</TabsTrigger>
              <TabsTrigger value="institucional">Instituição</TabsTrigger>
              <TabsTrigger value="impressao">Impressão</TabsTrigger>
              <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
            </TabsList>

            {/* ============================= BACKGROUND ============================= */}
            <TabsContent value="background" className="space-y-5 pt-5">
              <div className="flex flex-wrap gap-2">
                {BG_MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => patch("background", { ...theme.background, mode: m.value })}
                    className={`rounded-md border px-3 py-2 text-sm transition ${
                      theme.background.mode === m.value
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text-main)]"
                        : "border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {theme.background.mode === "solid" && (
                <ColorRow
                  label="Cor de fundo"
                  value={theme.background.solid}
                  onChange={(v) => patch("background", { ...theme.background, solid: v })}
                />
              )}

              {theme.background.mode === "gradient2" && (
                <>
                  <ColorRow label="Cor 1" value={theme.background.gradientFrom}
                    onChange={(v) => patch("background", { ...theme.background, gradientFrom: v })} />
                  <ColorRow label="Cor 2" value={theme.background.gradientTo}
                    onChange={(v) => patch("background", { ...theme.background, gradientTo: v })} />
                  <RangeRow label="Ângulo" value={theme.background.gradientAngle}
                    onChange={(v) => patch("background", { ...theme.background, gradientAngle: v })} />
                </>
              )}

              {theme.background.mode === "gradient3" && (
                <>
                  <ColorRow label="Cor 1" value={theme.background.gradient3From}
                    onChange={(v) => patch("background", { ...theme.background, gradient3From: v })} />
                  <ColorRow label="Cor central" value={theme.background.gradient3Mid}
                    onChange={(v) => patch("background", { ...theme.background, gradient3Mid: v })} />
                  <ColorRow label="Cor 3" value={theme.background.gradient3To}
                    onChange={(v) => patch("background", { ...theme.background, gradient3To: v })} />
                  <RangeRow label="Ângulo" value={theme.background.gradient3Angle}
                    onChange={(v) => patch("background", { ...theme.background, gradient3Angle: v })} />
                </>
              )}

              {/* Blobs */}
              <div className="rounded-lg border border-[color:var(--border-strong)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Blobs decorativos</Label>
                    <p className="text-xs text-[color:var(--text-muted)]">Manchas suaves coloridas sobre o fundo.</p>
                  </div>
                  <Switch
                    checked={theme.background.blobsEnabled}
                    onCheckedChange={(v) => patch("background", { ...theme.background, blobsEnabled: v })}
                  />
                </div>

                {theme.background.blobsEnabled && (
                  <div className="mt-4 space-y-3">
                    {theme.background.blobs.map((b, i) => (
                      <BlobRow
                        key={i}
                        blob={b}
                        onChange={(nb) => {
                          const blobs = theme.background.blobs.slice();
                          blobs[i] = nb;
                          patch("background", { ...theme.background, blobs });
                        }}
                        onRemove={() => {
                          const blobs = theme.background.blobs.filter((_, j) => j !== i);
                          patch("background", { ...theme.background, blobs });
                        }}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next: BlobItem = {
                          enabled: true,
                          color: "#c9a655",
                          position: "mc",
                          size: 280,
                          opacity: 0.3,
                        };
                        patch("background", { ...theme.background, blobs: [...theme.background.blobs, next] });
                      }}
                    >
                      <Plus className="size-4" /> Adicionar blob
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ============================= ICONS ============================= */}
            <TabsContent value="icons" className="space-y-4 pt-5">
              <ColorRow label="Cor do ícone" value={theme.icons.pathColor}
                onChange={(v) => patch("icons", { ...theme.icons, pathColor: v })} />
              <ColorRow label="Cor de fundo do círculo" value={theme.icons.bgColor}
                onChange={(v) => patch("icons", { ...theme.icons, bgColor: v })} />
            </TabsContent>

            {/* ============================= TYPOGRAPHY ============================= */}
            <TabsContent value="typography" className="space-y-4 pt-5">
              {(["nome", "cargo", "contato", "institucional"] as const).map((k) => (
                <div key={k} className="grid grid-cols-1 gap-3 rounded-lg border border-[color:var(--border-strong)] p-3 sm:grid-cols-[1fr_1fr]">
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
                  <ColorRow label="Cor" value={theme.typography[k].color}
                    onChange={(v) => patch("typography", { ...theme.typography, [k]: { ...theme.typography[k], color: v } })} />
                </div>
              ))}
            </TabsContent>

            {/* ============================= INSTITUCIONAL ============================= */}
            <TabsContent value="impressao" className="space-y-4 pt-5">
              <div className="space-y-1.5">
                <Label>Modelo do cartão</Label>
                <div className="flex gap-2">
                  {(["novo", "antigo"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => patch("impressao", { ...theme.impressao, modelo: m })}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition ${
                        theme.impressao.modelo === m
                          ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10 text-[color:var(--text-main)]"
                          : "border-[color:var(--border-strong)] text-[color:var(--text-muted)]"
                      }`}
                    >
                      {m === "novo" ? "Novo (padrão)" : "Antigo"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[color:var(--text-muted)]">
                  O modelo antigo usa a arte azul clássica, tipografia Frutiger e exibe celular e
                  e-mail no lugar do QR Code.
                </p>
              </div>
              <p className="text-sm text-[color:var(--text-muted)]">
                Artes do cartão de visitas impresso (90x48&nbsp;mm). Envie imagens na proporção
                90x48 (ideal 1063x567&nbsp;px). Em branco, o sistema usa a arte padrão da Conexão.
              </p>
              {theme.impressao.modelo === "antigo" ? (
                <>
                  <ArtUploader
                    label="Arte da frente (modelo antigo)"
                    url={theme.impressao.antigoFrenteUrl}
                    onChange={(v) =>
                      patch("impressao", { ...theme.impressao, antigoFrenteUrl: v })
                    }
                  />
                  <ArtUploader
                    label="Arte do verso (modelo antigo)"
                    url={theme.impressao.antigoVersoUrl}
                    onChange={(v) =>
                      patch("impressao", { ...theme.impressao, antigoVersoUrl: v })
                    }
                  />
                </>
              ) : (
                <>
                  <ArtUploader
                    label="Arte da frente"
                    url={theme.impressao.frenteUrl}
                    onChange={(v) => patch("impressao", { ...theme.impressao, frenteUrl: v })}
                  />
                  <ArtUploader
                    label="Arte do verso"
                    url={theme.impressao.versoUrl}
                    onChange={(v) => patch("impressao", { ...theme.impressao, versoUrl: v })}
                  />
                </>
              )}


              <div className="space-y-4 border-t border-[color:var(--border-strong)] pt-4">
                <p className="text-sm font-medium text-[color:var(--text-main)]">
                  Bloco logo + site (frente)
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Espaçamento do topo</Label>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {theme.impressao.marcaTop.toFixed(1)} mm
                    </span>
                  </div>
                  <Slider
                    min={MARCA_LIMITS.top.min}
                    max={MARCA_LIMITS.top.max}
                    step={MARCA_LIMITS.top.step}
                    value={[theme.impressao.marcaTop]}
                    onValueChange={([v]) =>
                      patch("impressao", { ...theme.impressao, marcaTop: v })
                    }
                  />
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Distância entre o topo do cartão e o bloco com logo e endereço do site.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Altura do logo</Label>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {theme.impressao.marcaLogoAltura.toFixed(1)} mm
                    </span>
                  </div>
                  <Slider
                    min={MARCA_LIMITS.logoHeight.min}
                    max={MARCA_LIMITS.logoHeight.max}
                    step={MARCA_LIMITS.logoHeight.step}
                    value={[theme.impressao.marcaLogoAltura]}
                    onValueChange={([v]) =>
                      patch("impressao", { ...theme.impressao, marcaLogoAltura: v })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* ============================= ASSINATURA ============================= */}
            <TabsContent value="assinatura" className="space-y-4 pt-5">
              <p className="text-sm text-[color:var(--text-muted)]">
                Arte de fundo da assinatura de e-mail (150x50&nbsp;mm, ideal
                1772x591&nbsp;px). Em branco, o sistema usa a arte padrão da Conexão.
              </p>
              <ArtUploader
                label="Fundo da assinatura"
                aspect="150/50"
                maxSize={1772}
                url={theme.assinatura.bgUrl}
                onChange={(v) => patch("assinatura", { ...theme.assinatura, bgUrl: v })}
              />
            </TabsContent>

            <TabsContent value="foto-perfil" className="space-y-4 pt-5">
              <p className="text-sm text-[color:var(--text-muted)]">
                Arte de fundo da foto de perfil (1080x1080&nbsp;px). Em branco, o
                sistema usa a arte padrão da Conexão.
              </p>
              <ArtUploader
                label="Fundo da foto de perfil"
                aspect="1/1"
                maxSize={1080}
                url={theme.fotoPerfil.bgUrl}
                onChange={(v) => patch("fotoPerfil", { ...theme.fotoPerfil, bgUrl: v })}
              />
            </TabsContent>

            <TabsContent value="institucional" className="space-y-4 pt-5">
              <LogoUploader
                url={theme.institucional.logoUrl}
                width={theme.institucional.logoWidth}
                height={theme.institucional.logoHeight}
                onChange={(p) => patch("institucional", { ...theme.institucional, ...p })}
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Nome da empresa</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[color:var(--text-muted)]">Exibir</span>
                    <Switch
                      checked={theme.institucional.nomeEmpresaEnabled}
                      onCheckedChange={(v) => patch("institucional", { ...theme.institucional, nomeEmpresaEnabled: v })}
                    />
                  </div>
                </div>
                <Input
                  value={theme.institucional.nomeEmpresa}
                  onChange={(e) => patch("institucional", { ...theme.institucional, nomeEmpresa: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Endereço</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[color:var(--text-muted)]">Exibir</span>
                    <Switch
                      checked={theme.institucional.enderecoEnabled}
                      onCheckedChange={(v) => patch("institucional", { ...theme.institucional, enderecoEnabled: v })}
                    />
                  </div>
                </div>
                <Input
                  value={theme.institucional.endereco}
                  onChange={(e) => patch("institucional", { ...theme.institucional, endereco: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Site</Label>
                <Input
                  value={theme.institucional.site}
                  onChange={(e) => patch("institucional", { ...theme.institucional, site: e.target.value })}
                />
              </div>

              <div className="rounded-lg border border-[color:var(--border-strong)] p-3">
                <Label className="text-base">Redes sociais</Label>
                <p className="mb-3 text-xs text-[color:var(--text-muted)]">Ative, defina URL e a cor do ícone.</p>
                <div className="space-y-4">
                  {SOCIAL_KEYS.map((k) => {
                    const enabledKey = `${k}Enabled` as const;
                    return (
                      <div key={k} className="space-y-2 rounded-md border border-[color:var(--border-strong)]/60 p-3">
                        <div className="grid grid-cols-[auto_1fr] items-center gap-3">
                          <Switch
                            checked={theme.institucional[enabledKey]}
                            onCheckedChange={(v) =>
                              patch("institucional", { ...theme.institucional, [enabledKey]: v })
                            }
                          />
                          <span className="text-sm font-medium capitalize text-[color:var(--text-main)]">{k}</span>
                        </div>
                        <Input
                          value={theme.institucional[k]}
                          onChange={(e) =>
                            patch("institucional", { ...theme.institucional, [k]: e.target.value })
                          }
                          placeholder={`https://${k}.com/...`}
                        />
                        <ColorRow
                          label="Cor do ícone"
                          value={theme.institucional.socialColors[k]}
                          onChange={(v) =>
                            patch("institucional", {
                              ...theme.institucional,
                              socialColors: { ...theme.institucional.socialColors, [k]: v },
                            })
                          }
                        />
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-1">
          <Label className="text-xs">Tamanho dos ícones: {theme.institucional.socialIconSize}px</Label>
          <input
            type="range"
            min={12}
            max={48}
            value={theme.institucional.socialIconSize}
            onChange={(e) =>
              patch("institucional", {
                ...theme.institucional,
                socialIconSize: Number(e.target.value),
              })
            }
            className="w-full"
          />
        </div>
      </div>
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

/* ----------------- Sub-components ----------------- */

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
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

function RangeRow({ label, value, onChange, min = 0, max = 360 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}: {value}°</Label>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

function BlobRow({ blob, onChange, onRemove }: { blob: BlobItem; onChange: (b: BlobItem) => void; onRemove: () => void }) {
  return (
    <div className="rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface-hover)]/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={blob.enabled} onCheckedChange={(v) => onChange({ ...blob, enabled: v })} />
          <input
            type="color"
            value={blob.color}
            onChange={(e) => onChange({ ...blob, color: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-[color:var(--border-strong)] bg-transparent"
          />
          <span className="font-mono text-xs text-[color:var(--text-muted)]">{blob.color}</span>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="size-4 text-[color:var(--error)]" />
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {BLOB_POSITIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange({ ...blob, position: p.value as BlobPosition })}
            className={`rounded border px-2 py-1.5 text-[11px] transition ${
              blob.position === p.value
                ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text-main)]"
                : "border-[color:var(--border-strong)] text-[color:var(--text-muted)] hover:text-[color:var(--text-main)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tamanho: {blob.size}px</Label>
          <input type="range" min={80} max={600} value={blob.size}
            onChange={(e) => onChange({ ...blob, size: Number(e.target.value) })} className="w-full" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Opacidade: {Math.round(blob.opacity * 100)}%</Label>
          <input type="range" min={5} max={100} value={Math.round(blob.opacity * 100)}
            onChange={(e) => onChange({ ...blob, opacity: Number(e.target.value) / 100 })} className="w-full" />
        </div>
      </div>
    </div>
  );
}

function LogoUploader({
  url, width, height, onChange,
}: {
  url: string; width: number; height: number;
  onChange: (p: { logoUrl?: string; logoWidth?: number; logoHeight?: number }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 4MB)");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await compressImageContain(f, 512);
      onChange({ logoUrl: dataUrl });
    } catch {
      toast.error("Falha ao processar imagem");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-[color:var(--border-strong)] p-3">
      <Label className="text-base">Logo do rodapé</Label>
      <div className="mt-3 flex items-center gap-4">
        <div
          className="grid shrink-0 place-items-center rounded border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-hover)]/40"
          style={{ width: Math.max(width, 48), height: Math.max(height, 32) }}
        >
          {url ? (
            <img src={url} alt="Logo" style={{ width, height, objectFit: "contain" }} />
          ) : (
            <Upload className="size-5 text-[color:var(--text-muted)]" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Enviar logo
            </Button>
            {url && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ logoUrl: "" })}>
                <Trash2 className="size-4 text-[color:var(--error)]" /> Remover
              </Button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-[color:var(--text-muted)]">PNG/SVG com fundo transparente até 4MB</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Largura: {width}px</Label>
          <input type="range" min={40} max={320} value={width}
            onChange={(e) => onChange({ logoWidth: Number(e.target.value) })} className="w-full" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Altura: {height}px</Label>
          <input type="range" min={16} max={160} value={height}
            onChange={(e) => onChange({ logoHeight: Number(e.target.value) })} className="w-full" />
        </div>
      </div>
    </div>
  );
}


function ArtUploader({
  label,
  url,
  onChange,
  aspect = "90/48",
  maxSize = 1400,
}: {
  label: string;
  url: string;
  onChange: (v: string) => void;
  aspect?: string;
  maxSize?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  async function handleFile(f?: File | null) {
    if (!f) return;
    setBusy(true);
    try {
      onChange(await compressImageContain(f, maxSize));
    } catch {
      toast.error("Falha ao carregar a imagem");
    } finally {
      setBusy(false);
    }
  }

  async function handleLink() {
    if (!link.trim()) return;
    setBusy(true);
    try {
      onChange(await imageLinkToDataUrl(link, maxSize));
      setLink("");
      toast.success("Arte importada do link");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar do link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-[color:var(--border-strong)] p-4">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-base">{label}</Label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Enviar
          </Button>
          {url && (
            <Button variant="ghost" size="sm" onClick={() => onChange("")}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="mt-3 flex gap-2">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Cole o link (Google Drive, Dropbox, OneDrive ou URL da imagem)"
          disabled={busy}
        />
        <Button variant="outline" size="sm" onClick={handleLink} disabled={busy || !link.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <LinkIcon className="size-4" />}
          Importar
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-[color:var(--text-muted)]">
        O arquivo precisa estar compartilhado como “qualquer pessoa com o link”. A imagem é copiada
        para o tema, então o link pode ser removido depois.
      </p>

      <div className="mt-3 overflow-hidden rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface-hover)]">
        <img
          src={url || ""}
          alt={label}
          className="w-full object-cover"
          style={{ aspectRatio: aspect, display: url ? "block" : "none" }}
        />
        {!url && (
          <div
            className="grid w-full place-items-center text-xs text-[color:var(--text-muted)]"
            style={{ aspectRatio: aspect }}
          >
            Arte padrão
          </div>

        )}
      </div>
    </div>
  );
}
