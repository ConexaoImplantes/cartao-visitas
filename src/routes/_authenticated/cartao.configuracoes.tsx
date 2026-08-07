import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, Globe, UserCog, Database, Sparkles, Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  DEFAULT_SETTINGS,
  fetchSettings,
  normalizeBaseUrl,
  saveSettings,
  type AppSettings,
} from "@/lib/settings";
import { compressImageContain } from "@/lib/image-utils";
import { fetchCardStats } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/cartao/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações do sistema" },
      {
        name: "description",
        content: "Domínio público, padrões de cadastro, gestão de dados e identidade do sistema.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { loading: authLoading, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast.error("Acesso restrito ao Super Admin");
      navigate({ to: "/cartao/dashboard", replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    if (authLoading || !isSuperAdmin) return;
    fetchSettings()
      .then(setSettings)
      .catch(() => {
        toast.error("Falha ao carregar configurações");
        setSettings(DEFAULT_SETTINGS);
      });
  }, [authLoading, isSuperAdmin]);

  function patch<K extends keyof AppSettings>(key: K, value: Partial<AppSettings[K]>) {
    setSettings((s) => (s ? { ...s, [key]: { ...s[key], ...value } } : s));
  }

  async function handleSave() {
    if (!settings) return;
    const next: AppSettings = {
      ...settings,
      publico: {
        ...settings.publico,
        baseUrl: normalizeBaseUrl(settings.publico.baseUrl),
      },
    };
    setSaving(true);
    const error = await saveSettings(next);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    setSettings(next);
    toast.success("Configurações salvas");
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageContain(file, 512);
      patch("marca", { logoUrl: dataUrl });
    } catch {
      toast.error("Não foi possível carregar a imagem");
    }
  }

  async function exportCsv() {
    const [{ data, error }, stats] = await Promise.all([
      supabase
        .from("collaborators")
        .select("id,nome,slug,cargo,email,whatsapp,telefone_fixo,status,created_at")
        .order("nome"),
      fetchCardStats(null),
    ]);
    if (error || !data) {
      toast.error("Falha ao exportar", { description: error?.message });
      return;
    }
    const headers = [
      "nome",
      "slug",
      "cargo",
      "email",
      "whatsapp",
      "telefone_fixo",
      "status",
      "created_at",
      "visitas",
      "cliques",
    ];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(";"),
      ...data.map((r: Record<string, unknown>) => {
        const row = r as Record<string, unknown>;
        const s = stats[String(row['id'])];
        const withStats: Record<string, unknown> = {
          ...row,
          visitas: Number(s?.views ?? 0),
          cliques: Number(s?.clicks ?? 0),
        };
        return headers.map((h) => escape(withStats[h])).join(";");
      }),
    ].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `colaboradores-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${data.length} registro(s) exportado(s)`);
  }

  async function purgeInactive() {
    setPurging(true);
    const { error, count } = await supabase
      .from("collaborators")
      .delete({ count: "exact" })
      .eq("status", "inativo");
    setPurging(false);
    setConfirmPurge(false);
    if (error) {
      toast.error("Falha na limpeza", { description: error.message });
      return;
    }
    toast.success(`${count ?? 0} colaborador(es) inativo(s) removido(s)`);
  }

  if (authLoading || !isSuperAdmin || !settings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[color:var(--text-muted)]">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
      </div>
    );
  }

  const previewBase = normalizeBaseUrl(settings.publico.baseUrl) || "(domínio atual)";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">Configurações</h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Área exclusiva do Super Admin.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar
        </Button>
      </header>

      <Section icon={Globe} title="Domínio e link público" description="Endereço usado para gerar links e QR Codes dos colaboradores.">
        <Field label="Domínio base">
          <Input
            value={settings.publico.baseUrl}
            onChange={(e) => patch("publico", { baseUrl: e.target.value })}
            placeholder="conexao.com.br"
          />
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Exemplo do link gerado: <strong>{previewBase}/nome-do-consultor</strong>. Deixe vazio para usar o
            domínio de onde o sistema está aberto.
          </p>
          {domainInvalid && (
            <p className="mt-1 text-xs text-[color:var(--error)]">
              Domínio inválido. Use o formato <strong>cartao.suaempresa.com.br</strong>, sem barras ou espaços.
            </p>
          )}
          {!domainInvalid && domainMismatch && (
            <p className="mt-1 text-xs text-[color:var(--warning)]">
              Este domínio é diferente de onde o sistema está aberto ({currentOrigin}). Ele só funcionará
              depois que o subdomínio estiver conectado e validado.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={domainInvalid}
              onClick={() => window.open(`${previewBaseUrl}/exemplo`, "_blank", "noopener,noreferrer")}
            >
              Testar link
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowGuide((v) => !v)}>
              {showGuide ? "Ocultar" : "Ver"} passo a passo (Locaweb)
            </Button>
          </div>
          {showGuide && <LocawebGuide />}
        </Field>
        <Field label="Apelidos reservados (separados por vírgula)">
          <Input
            value={settings.publico.reservedSlugs.join(", ")}
            onChange={(e) =>
              patch("publico", {
                reservedSlugs: e.target.value
                  .split(",")
                  .map((s) => s.trim().toLowerCase())
                  .filter(Boolean),
              })
            }
            placeholder="blog, contato, sobre"
          />
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            Palavras que não poderão ser usadas como link de colaborador.
          </p>
        </Field>
      </Section>

      <Section icon={UserCog} title="Padrões de cadastro" description="Valores pré-preenchidos ao criar novos colaboradores.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="DDI padrão">
            <Input
              value={settings.cadastro.ddiPadrao}
              onChange={(e) => patch("cadastro", { ddiPadrao: e.target.value.replace(/\D/g, "").slice(0, 3) })}
            />
          </Field>
          <Field label="DDD padrão">
            <Input
              value={settings.cadastro.dddPadrao}
              onChange={(e) => patch("cadastro", { dddPadrao: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            />
          </Field>
          <Field label="Status inicial">
            <div className="flex h-9 items-center gap-3">
              <Switch
                checked={settings.cadastro.statusPadrao === "ativo"}
                onCheckedChange={(v) => patch("cadastro", { statusPadrao: v ? "ativo" : "inativo" })}
              />
              <span className="text-sm text-[color:var(--text-muted)]">
                {settings.cadastro.statusPadrao === "ativo" ? "Ativo" : "Inativo"}
              </span>
            </div>
          </Field>
        </div>
        <Field label="Apelido do link">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.cadastro.slugMode === "auto"}
              onCheckedChange={(v) => patch("cadastro", { slugMode: v ? "auto" : "manual" })}
            />
            <span className="text-sm text-[color:var(--text-muted)]">
              {settings.cadastro.slugMode === "auto"
                ? "Gerado automaticamente a partir do nome"
                : "Preenchido manualmente pelo admin"}
            </span>
          </div>
        </Field>
      </Section>

      <Section icon={Database} title="Gestão de dados" description="Exportação e limpeza da base de colaboradores.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> Exportar colaboradores (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmPurge(true)}
            className="text-[color:var(--error)] hover:text-[color:var(--error)]"
          >
            <Trash2 className="size-4" /> Excluir todos os inativos
          </Button>
        </div>
      </Section>

      <Section icon={Sparkles} title="Marca e identidade" description="Nome, logo e metadados de compartilhamento do sistema.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do sistema">
            <Input
              value={settings.marca.nomeSistema}
              onChange={(e) => patch("marca", { nomeSistema: e.target.value })}
            />
          </Field>
          <Field label="Logo do sistema">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-[color:var(--border-strong)] bg-[color:var(--surface-hover)]">
                {settings.marca.logoUrl ? (
                  <img src={settings.marca.logoUrl} alt="Logo" className="size-full object-contain" />
                ) : (
                  <Upload className="size-4 text-[color:var(--text-muted)]" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogo}
                className="block w-full text-sm text-[color:var(--text-muted)] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[color:var(--surface-hover)] file:px-3 file:py-2 file:text-sm file:text-[color:var(--text-main)]"
              />
            </div>
          </Field>
        </div>
        <Field label="Título de compartilhamento (SEO)">
          <Input
            value={settings.marca.metaTitle}
            onChange={(e) => patch("marca", { metaTitle: e.target.value })}
            placeholder="Conexão Implantes — Cartão digital"
          />
        </Field>
        <Field label="Descrição de compartilhamento (SEO)">
          <Input
            value={settings.marca.metaDescription}
            onChange={(e) => patch("marca", { metaDescription: e.target.value })}
            placeholder="Fale com nossos consultores pelo cartão digital."
          />
        </Field>
      </Section>

      <AlertDialog open={confirmPurge} onOpenChange={setConfirmPurge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir todos os colaboradores inativos?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os Link Trees com status inativo serão removidos permanentemente. Esta ação é
              irreversível — recomendamos exportar o CSV antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={purgeInactive}
              disabled={purging}
              className="bg-[color:var(--error)] text-white hover:bg-[color:var(--error)]/90"
            >
              {purging ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[color:var(--surface-hover)] text-[color:var(--accent)]">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold text-[color:var(--text-main)]">{title}</h2>
          <p className="text-xs text-[color:var(--text-muted)]">{description}</p>
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </Label>
      {children}
    </div>
  );
}
