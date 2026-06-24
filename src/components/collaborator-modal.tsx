import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-utils";
import type { Collaborator } from "@/lib/types";

const schema = z.object({
  nome: z.string().trim().min(2, "Nome obrigatório").max(120),
  cargo: z.string().trim().min(2, "Cargo obrigatório").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  whatsapp: z.string().trim().min(8, "WhatsApp obrigatório").max(32),
  telefone_fixo: z.string().trim().max(32).optional().or(z.literal("")),
  foto_url: z.string().optional().nullable(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collaborator: Collaborator | null;
  onSaved: () => void;
}

export function CollaboratorModal({ open, onOpenChange, collaborator, onSaved }: Props) {
  const editing = !!collaborator;
  const [form, setForm] = useState({
    nome: "",
    cargo: "",
    email: "",
    whatsapp: "",
    telefone_fixo: "",
    foto_url: "" as string | null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        nome: collaborator?.nome ?? "",
        cargo: collaborator?.cargo ?? "",
        email: collaborator?.email ?? "",
        whatsapp: collaborator?.whatsapp ?? "",
        telefone_fixo: collaborator?.telefone_fixo ?? "",
        foto_url: collaborator?.foto_url ?? "",
      });
    }
  }, [open, collaborator]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 8MB)");
      return;
    }
    try {
      const dataUrl = await compressImage(f, 480, 0.82);
      setForm((p) => ({ ...p, foto_url: dataUrl }));
    } catch {
      toast.error("Falha ao processar imagem");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSaving(true);
    const payload = {
      ...parsed.data,
      telefone_fixo: parsed.data.telefone_fixo || null,
      foto_url: parsed.data.foto_url || null,
    };
    const { error } = editing
      ? await supabase.from("collaborators").update(payload).eq("id", collaborator!.id)
      : await supabase.from("collaborators").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success(editing ? "Colaborador atualizado" : "Link Tree gerado com sucesso");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-[color:var(--surface)]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? "Editar colaborador" : "Novo colaborador"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[color:var(--border-strong)] bg-[color:var(--surface-hover)]">
              {form.foto_url ? (
                <img src={form.foto_url} alt="Preview" className="size-full object-cover" />
              ) : (
                <Upload className="size-6 text-[color:var(--text-muted)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Label className="mb-1 block">Foto</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="block w-full text-sm text-[color:var(--text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--surface-hover)] file:px-3 file:py-2 file:text-sm file:text-[color:var(--text-main)] file:cursor-pointer"
              />
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">JPG/PNG até 8MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nome completo">
              <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required />
            </Field>
            <Field label="Cargo">
              <Input value={form.cargo} onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))} required />
            </Field>
            <Field label="E-mail institucional">
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </Field>
            <Field label="WhatsApp (com DDD/país)">
              <Input placeholder="+55 11 99999-9999" value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} required />
            </Field>
            <Field label="Telefone fixo / Ramal">
              <Input value={form.telefone_fixo} onChange={(e) => setForm((p) => ({ ...p, telefone_fixo: e.target.value }))} />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90">
              {saving ? <Loader2 className="size-4 animate-spin" /> : editing ? "Salvar" : "Gerar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
