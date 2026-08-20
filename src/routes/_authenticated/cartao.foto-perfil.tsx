import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  ImagePlus,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { normalizeTheme, type Collaborator } from "@/lib/types";
import { ProfilePhotoPreview } from "@/components/profile-photo-preview";
import { ArtViewerDialog, EMPTY_ART_VIEWER, type ArtViewerState } from "@/components/art-viewer-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { useServerFn } from "@tanstack/react-start";
import { removeBgRemote } from "@/lib/remove-bg.functions";
import { removeBackground, blobToDataUrl, trimAndResizePng } from "@/lib/background-removal";
import {
  DEFAULT_FRAME,
  FRAME_LIMITS,
  downloadProfilePhoto,
  normalizeFrame,
  profileFileName,
  profilePhotoBlob,
  profilePhotoDataUrl,
  type ProfileFrame,
} from "@/lib/profile-photo";

export const Route = createFileRoute("/_authenticated/cartao/foto-perfil")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Foto de Perfil Corporativa | Conexão Implantes" },
      {
        name: "description",
        content:
          "Gere a foto de perfil institucional 1080x1080 dos colaboradores: recorte do fundo, enquadramento e download.",
      },
      { property: "og:title", content: "Foto de Perfil Corporativa | Conexão Implantes" },
      {
        property: "og:description",
        content: "Arte 1080x1080 padronizada para as fotos de perfil da equipe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FotoPerfilPage,
});

function FotoPerfilPage() {
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/cartao/foto-perfil" });

  const [rows, setRows] = useState<Collaborator[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(search.id ?? null);
  const [bgUrl, setBgUrl] = useState("");

  const [person, setPerson] = useState<string | null>(null);
  const [usingLinktree, setUsingLinktree] = useState(false);
  const [frame, setFrame] = useState<ProfileFrame>({ ...DEFAULT_FRAME });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<
    "cut" | "cut-remote" | "one" | "batch" | "avatar" | "view" | null
  >(null);
  const callRemoveBgRemote = useServerFn(removeBgRemote);
  const [progress, setProgress] = useState("");
  const [sharing, setSharing] = useState<Collaborator | null>(null);
  const [viewer, setViewer] = useState<ArtViewerState>(EMPTY_ART_VIEWER);

  const fileRef = useRef<HTMLInputElement>(null);
  const pngRef = useRef<HTMLInputElement>(null);

  const canEdit = can("foto_perfil.edit");
  const canDownload = can("foto_perfil.download");

  useEffect(() => {
    if (!permLoading && !can("foto_perfil.view")) {
      toast.error("Você não tem permissão para acessar esta área");
      navigate({ to: "/cartao/tema", replace: true });
    }
  }, [permLoading, can, navigate]);

  useEffect(() => {
    supabase
      .from("theme_config")
      .select("config")
      .eq("id", "global")
      .maybeSingle()
      .then(({ data }) => setBgUrl(normalizeTheme(data?.config).fotoPerfil.bgUrl));

    supabase
      .from("collaborators")
      .select("*")
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro ao carregar colaboradores", { description: error.message });
          return;
        }
        const list = (data ?? []) as Collaborator[];
        setRows(list);
        setActiveId((prev) => prev ?? list[0]?.id ?? null);
      });
  }, []);

  const active = useMemo(
    () => (rows ?? []).find((r) => r.id === activeId) ?? null,
    [rows, activeId],
  );

  useEffect(() => {
    if (!active) return;
    // Sem recorte salvo? Reaproveita a foto já definida no Link Tree (modo estático).
    const linktreeOnly = !active.foto_recortada_url && !!active.foto_url;
    setPerson(active.foto_recortada_url ?? active.foto_url ?? null);
    setUsingLinktree(linktreeOnly);
    const saved = normalizeFrame(active.foto_perfil_ajuste);
    setFrame(linktreeOnly ? { ...saved, mode: "estatico" } : saved);
  }, [active?.id]);

  /** Carrega a foto atual do Link Tree como imagem estática 1080x1080. */
  function handleUseLinktreePhoto() {
    if (!active?.foto_url) return;
    setPerson(active.foto_url);
    setUsingLinktree(true);
    setFrame({ ...DEFAULT_FRAME, mode: "estatico" });
    toast.success("Foto do Link Tree carregada (imagem estática 1080×1080)");
  }


  /** Remove o fundo da foto que está carregada no editor. */
  async function handleRemoveBgCurrent() {
    if (!person) return;
    setBusy("cut");
    setProgress("Preparando...");
    try {
      const blob = await (await fetch(person)).blob();
      const raw = await removeBackground(blob, setProgress);
      setPerson(await trimAndResizePng(raw));
      setUsingLinktree(false);
      setFrame({ ...DEFAULT_FRAME });
      toast.success("Fundo removido. Ajuste o enquadramento e salve.");
    } catch (e: any) {
      toast.error("Falha ao remover o fundo", { description: e?.message });
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  /** Fallback: recorte pelo serviço remove.bg (50 imagens grátis/mês, saída em prévia). */
  async function handleRemoveBgRemote() {
    if (!person) return;
    setBusy("cut-remote");
    setProgress("Enviando para o recorte alternativo...");
    try {
      const res = await callRemoveBgRemote({ data: { dataUrl: person } });
      if (!res.ok) {
        toast.error("Recorte alternativo indisponível", { description: res.error });
        return;
      }
      setPerson(await trimAndResizePng(res.dataUrl));
      setUsingLinktree(false);
      setFrame({ ...DEFAULT_FRAME });
      toast.success("Fundo removido pela remove.bg", {
        description: "Resolução de prévia (plano gratuito). Ajuste o enquadramento e salve.",
      });
    } catch (e: any) {
      toast.error("Falha no recorte alternativo", { description: e?.message });
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        (r.cargo ?? "").toLowerCase().includes(q) ||
        (r.slug ?? "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)),
    );
  }

  async function handleUpload(file?: File | null) {
    if (!file) return;
    setBusy("cut");
    setProgress("Preparando...");
    try {
      const raw = await removeBackground(file, setProgress);
      setPerson(await trimAndResizePng(raw));
      setUsingLinktree(false);
      setFrame({ ...DEFAULT_FRAME });
      toast.success("Fundo removido. Ajuste o enquadramento e salve.");
    } catch (e: any) {
      toast.error("Falha ao remover o fundo", {
        description: e?.message ?? "Tente enviar um PNG já sem fundo.",
      });
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function handleUploadPng(file?: File | null) {
    if (!file) return;
    setBusy("cut");
    try {
      const dataUrl = await blobToDataUrl(file);
      setPerson(await trimAndResizePng(dataUrl));
      setUsingLinktree(false);
      setFrame({ ...DEFAULT_FRAME });
      toast.success("Imagem carregada");
    } catch (e: any) {
      toast.error("Falha ao carregar a imagem", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase
      .from("collaborators")
      .update({
        foto_recortada_url: person,
        foto_perfil_ajuste: frame as any,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    setRows((prev) =>
      (prev ?? []).map((r) =>
        r.id === active.id ? { ...r, foto_recortada_url: person, foto_perfil_ajuste: frame } : r,
      ),
    );
    toast.success("Foto de perfil salva");
  }

  async function handleView() {
    if (!active) return;
    setBusy("view");
    setViewer({
      open: true,
      title: `Foto de perfil — ${active.nome_cartao || active.nome}`,
      description: "Arte final em tamanho real (1080x1080 px).",
      url: null,
      kind: "image",
      loading: true,
      filename: profileFileName(active.nome_cartao || active.nome),
    });
    try {
      const blob = await profilePhotoBlob({ personUrl: person, bgUrl, frame });
      setViewer((v) => ({ ...v, url: URL.createObjectURL(blob), loading: false }));
    } catch (e: any) {
      setViewer(EMPTY_ART_VIEWER);
      toast.error("Falha ao gerar a arte", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadOne() {
    if (!active) return;
    setBusy("one");
    try {
      await downloadProfilePhoto(active.nome_cartao || active.nome, { personUrl: person, bgUrl, frame });
      toast.success("Arte gerada");
    } catch (e: any) {
      toast.error("Falha ao gerar a arte", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadBatch() {
    const items = (rows ?? []).filter((r) => selected.has(r.id));
    if (!items.length) {
      toast.error("Selecione ao menos um colaborador");
      return;
    }
    setBusy("batch");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const c of items) {
        const linktreeOnly = !c.foto_recortada_url && !!c.foto_url;
        const saved = normalizeFrame(c.foto_perfil_ajuste);
        const blob = await profilePhotoBlob({
          personUrl: c.foto_recortada_url ?? c.foto_url ?? null,
          bgUrl,
          frame: linktreeOnly ? { ...saved, mode: "estatico" } : saved,
        });

        zip.file(profileFileName(c.nome_cartao || c.nome), blob);
      }
      const out = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fotos-de-perfil.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${items.length} artes geradas`);
    } catch (e: any) {
      toast.error("Falha ao gerar as artes", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  async function handleUseAsAvatar() {
    if (!active) return;
    setBusy("avatar");
    try {
      const dataUrl = await profilePhotoDataUrl({ personUrl: person, bgUrl, frame }, 480);
      const { error } = await supabase
        .from("collaborators")
        .update({ foto_url: dataUrl })
        .eq("id", active.id);
      if (error) throw error;
      setRows((prev) =>
        (prev ?? []).map((r) => (r.id === active.id ? { ...r, foto_url: dataUrl } : r)),
      );
      toast.success("Arte aplicada como foto do Link Tree");
    } catch (e: any) {
      toast.error("Não foi possível aplicar no Link Tree", { description: e?.message });
    } finally {
      setBusy(null);
    }
  }

  if (permLoading || rows === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[color:var(--text-muted)]">
        <Loader2 className="mr-2 size-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">
          Foto de Perfil Corporativa
        </h1>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Envie a foto do colaborador, remova o fundo automaticamente e gere a arte padronizada
          1080×1080&nbsp;px para redes sociais e Link Tree.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ------------------------------ Lista ------------------------------ */}
        <aside className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar colaborador..."
              className="pl-9"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[color:var(--text-muted)]">
            <button className="hover:underline" onClick={toggleAll} type="button">
              {selected.size === filtered.length && filtered.length > 0
                ? "Limpar seleção"
                : "Selecionar todos"}
            </button>
            <span>{selected.size} selecionado(s)</span>
          </div>

          <ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto pr-1">
            {filtered.map((r) => {
              const isActive = r.id === activeId;
              return (
                <li key={r.id}>
                  <div
                    className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-[color:var(--surface-hover)] text-[color:var(--text-main)]"
                        : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)]"
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(r.id)}
                      onCheckedChange={() => toggle(r.id)}
                      aria-label={`Selecionar ${r.nome}`}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setActiveId(r.id)}
                    >
                      <div className="truncate font-medium text-[color:var(--text-main)]">
                        {r.nome_cartao || r.nome}
                      </div>
                      <div className="truncate text-xs">
                        {r.foto_recortada_url
                          ? "Foto pronta"
                          : r.foto_url
                            ? "Foto do Link Tree"
                            : "Sem foto"}
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
            {!filtered.length && (
              <li className="py-6 text-center text-sm text-[color:var(--text-muted)]">
                Nenhum colaborador encontrado.
              </li>
            )}
          </ul>

          {canDownload && (
            <Button
              className="mt-4 w-full gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
              onClick={handleDownloadBatch}
              disabled={busy !== null || !selected.size}
            >
              {busy === "batch" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Baixar selecionados (ZIP)
            </Button>
          )}
        </aside>

        {/* ------------------------------ Preview ------------------------------ */}
        <section className="space-y-5 rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-5">
          {!active ? (
            <p className="text-sm text-[color:var(--text-muted)]">
              Selecione um colaborador na lista para gerar a arte.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-6">
                <figure className="space-y-2">
                  <ProfilePhotoPreview personUrl={person} bgUrl={bgUrl} frame={frame} size={420} />
                  <figcaption className="text-center text-xs text-[color:var(--text-muted)]">
                    Arte final · 1080×1080&nbsp;px
                  </figcaption>
                </figure>

                <div className="min-w-[240px] flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label>Foto do colaborador</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={!canEdit || busy !== null}
                        onClick={() => fileRef.current?.click()}
                      >
                        {busy === "cut" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Sparkles className="size-4" />
                        )}
                        Enviar e remover fundo
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!canEdit || busy !== null}
                        onClick={() => pngRef.current?.click()}
                      >
                        <ImagePlus className="size-4" />
                        PNG já sem fundo
                      </Button>
                      {active.foto_url && (
                        <Button
                          variant="outline"
                          disabled={!canEdit || busy !== null}
                          onClick={handleUseLinktreePhoto}
                        >
                          <ImagePlus className="size-4" />
                          Usar foto do Link Tree
                        </Button>
                      )}
                      {usingLinktree && (
                        <Button
                          variant="outline"
                          disabled={!canEdit || busy !== null}
                          onClick={handleRemoveBgCurrent}
                        >
                          {busy === "cut" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
                          Remover fundo desta foto
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {frame.mode === "estatico"
                        ? "Modo estático: a foto do Link Tree é usada como imagem 1080×1080, preenchendo todo o espaço, sem moldura e sem fundo."
                        : "Modo em camadas: fundo + foto sem fundo + moldura dourada, com zoom e posicionamento."}
                    </p>

                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        handleUpload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <input
                      ref={pngRef}
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={(e) => {
                        handleUploadPng(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {progress ||
                        "O recorte roda no seu navegador. No primeiro uso o modelo é baixado (~20 MB)."}
                    </p>
                  </div>

                  {frame.mode === "camadas" && (
                    <div className="space-y-4 border-t border-[color:var(--border-strong)] pt-4">
                      <FrameSlider
                        label="Zoom"
                        value={frame.zoom}
                        limits={FRAME_LIMITS.zoom}
                        disabled={!canEdit || !person}
                        format={(v) => `${Math.round(v * 100)}%`}
                        onChange={(v) => setFrame((f) => ({ ...f, zoom: v }))}
                      />
                      <FrameSlider
                        label="Posição horizontal"
                        value={frame.x}
                        limits={FRAME_LIMITS.x}
                        disabled={!canEdit || !person}
                        format={(v) => `${Math.round(v)} px`}
                        onChange={(v) => setFrame((f) => ({ ...f, x: v }))}
                      />
                      <FrameSlider
                        label="Posição vertical"
                        value={frame.y}
                        limits={FRAME_LIMITS.y}
                        disabled={!canEdit || !person}
                        format={(v) => `${Math.round(v)} px`}
                        onChange={(v) => setFrame((f) => ({ ...f, y: v }))}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canEdit}
                        onClick={() => setFrame({ ...DEFAULT_FRAME })}
                      >
                        <RotateCcw className="size-4" />
                        Restaurar enquadramento padrão
                      </Button>
                    </div>
                  )}

                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-[color:var(--border-strong)] pt-5">
                <Button onClick={handleSave} disabled={!canEdit || saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={handleView} disabled={busy !== null}>
                  {busy === "view" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  Ver em tamanho real
                </Button>
                {canDownload && (
                  <>
                    <Button
                      onClick={handleDownloadOne}
                      disabled={busy !== null}
                      className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
                    >
                      {busy === "one" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Baixar esta arte
                    </Button>
                    <Button variant="outline" onClick={() => setSharing(active)}>
                      <Share2 className="size-4" />
                      Compartilhar
                    </Button>
                  </>
                )}
                {canEdit && (
                  <Button variant="outline" onClick={handleUseAsAvatar} disabled={busy !== null}>
                    {busy === "avatar" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserRound className="size-4" />
                    )}
                    Usar no Link Tree
                  </Button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ShareDialog collaborator={sharing} onOpenChange={(o) => !o && setSharing(null)} />

      <ArtViewerDialog
        state={viewer}
        onOpenChange={(o) => setViewer((v) => (o ? { ...v, open: true } : EMPTY_ART_VIEWER))}
      />
    </div>
  );
}

function FrameSlider({
  label,
  value,
  limits,
  disabled,
  format,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number; step: number };
  disabled?: boolean;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-[color:var(--text-muted)]">{format(value)}</span>
      </div>
      <Slider
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={[value]}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
