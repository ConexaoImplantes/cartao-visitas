import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, Download, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { CSV_TEMPLATE, CSV_HEADERS, parseCsv, mapRows, type ImportRow } from "@/lib/csv-import";

export const Route = createFileRoute("/_authenticated/cartao/importar")({
  head: () => ({
    meta: [
      { title: "Importação em massa de Link Trees" },
      { name: "description", content: "Crie vários cartões digitais de uma só vez a partir de uma planilha CSV." },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const { can, loading: permLoading } = usePermissions();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: { line: number; message: string }[] } | null>(null);

  useEffect(() => {
    if (!permLoading && !can("dashboard.create")) {
      toast.error("Você não tem permissão para importar colaboradores");
      navigate({ to: "/cartao/dashboard", replace: true });
    }
  }, [permLoading, can, navigate]);

  const valid = rows?.filter((r) => r.errors.length === 0) ?? [];
  const invalid = rows?.filter((r) => r.errors.length > 0) ?? [];

  function downloadTemplate() {
    const blob = new Blob([`\uFEFF${CSV_TEMPLATE}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modelo-link-tree.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function handleFile(file: File) {
    setResult(null);
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 2 MB)");
      return;
    }
    const text = await file.text();
    const { rows: parsed, missingHeaders } = mapRows(parseCsv(text));
    if (missingHeaders.length) {
      toast.error("Colunas obrigatórias ausentes", { description: missingHeaders.join(", ") });
      return;
    }
    if (parsed.length === 0) {
      toast.error("Nenhuma linha encontrada na planilha");
      return;
    }
    if (parsed.length > 500) {
      toast.error("Limite de 500 colaboradores por importação");
      return;
    }
    // Marca e-mails que já existem no banco para evitar duplicidade
    const emails = parsed.map((r) => r.email).filter(Boolean);
    if (emails.length) {
      const { data: existing } = await supabase
        .from("collaborators")
        .select("email")
        .in("email", emails);
      const taken = new Set((existing ?? []).map((e) => (e.email ?? "").toLowerCase()));
      for (const r of parsed) {
        if (r.email && taken.has(r.email)) r.errors.push("E-mail já cadastrado");
      }
    }

    setFileName(file.name);
    setRows(parsed);
  }




  async function runImport() {
    if (!valid.length) return;
    setImporting(true);
    const { data: auth } = await supabase.auth.getUser();
    const createdBy = auth.user?.id ?? null;

    let created = 0;
    const failed: { line: number; message: string }[] = [];

    for (let i = 0; i < valid.length; i += 25) {
      const chunk = valid.slice(i, i + 25);
      const payload = chunk.map((r) => ({
        nome: r.nome,
        cargo: r.cargo,
        email: r.email,
        whatsapp: r.whatsapp,
        telefone_fixo: r.telefone_fixo,
        foto_url: r.foto_url,
        status: r.status,
        created_by: createdBy,
      }));
      const { error } = await supabase.from("collaborators").insert(payload);
      if (!error) {
        created += chunk.length;
        continue;
      }
      // Fallback linha a linha para identificar exatamente o que falhou
      for (const r of chunk) {
        const { error: rowError } = await supabase.from("collaborators").insert({
          nome: r.nome,
          cargo: r.cargo,
          email: r.email,
          whatsapp: r.whatsapp,
          telefone_fixo: r.telefone_fixo,
          foto_url: r.foto_url,
          status: r.status,
          created_by: createdBy,
        });
        if (rowError) failed.push({ line: r.line, message: rowError.message });
        else created += 1;
      }
    }

    setImporting(false);
    setResult({ created, failed });
    if (created) toast.success(`${created} Link Tree(s) criado(s) com sucesso`);
    if (failed.length) toast.error(`${failed.length} linha(s) não puderam ser importadas`);
  }

  function reset() {
    setRows(null);
    setFileName(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-[color:var(--text-main)]">
            Importação em massa
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Crie diversos Link Trees Corporativos de uma só vez a partir de uma planilha CSV.
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="size-4" /> Baixar modelo CSV
        </Button>
      </header>

      <section className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-6">
        <h2 className="font-display text-lg font-semibold text-[color:var(--text-main)]">1. Envie a planilha</h2>
        <p className="mt-1 text-sm text-[color:var(--text-muted)]">
          Colunas aceitas (separador <strong>;</strong> ou <strong>,</strong>):{" "}
          <code className="break-all text-xs">{CSV_HEADERS.join(", ")}</code>. Obrigatórias: nome, cargo,
          e-mail, DDD e número do WhatsApp. Use <code>telefone_tipo</code> como{" "}
          <code>fixo</code> ou <code>ramal</code>.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
          >
            <Upload className="size-4" /> Selecionar arquivo CSV
          </Button>
          {fileName && (
            <span className="inline-flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <FileSpreadsheet className="size-4" /> {fileName}
            </span>
          )}
          {rows && (
            <Button variant="ghost" onClick={reset}>
              Limpar
            </Button>
          )}
        </div>
      </section>

      {rows && (
        <section className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border-strong)] p-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[color:var(--text-main)]">
                2. Revise antes de importar
              </h2>
              <p className="text-sm text-[color:var(--text-muted)]">
                <span style={{ color: "var(--success)" }}>{valid.length} válida(s)</span>
                {invalid.length > 0 && (
                  <>
                    {" · "}
                    <span style={{ color: "var(--error)" }}>{invalid.length} com erro</span>
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={runImport}
              disabled={!valid.length || importing}
              className="gradient-accent text-[color:var(--text-inverted)] hover:opacity-90"
            >
              {importing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Importar {valid.length} colaborador(es)
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <tr className="border-b border-[color:var(--border-strong)]">
                  <th className="p-3">Linha</th>
                  <th className="p-3">Nome</th>
                  <th className="hidden p-3 md:table-cell">Cargo</th>
                  <th className="hidden p-3 lg:table-cell">E-mail</th>
                  <th className="p-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-b border-[color:var(--border-strong)] last:border-0">
                    <td className="p-3 text-[color:var(--text-muted)]">{r.line}</td>
                    <td className="p-3 font-medium text-[color:var(--text-main)]">{r.nome || "—"}</td>
                    <td className="hidden p-3 text-[color:var(--text-muted)] md:table-cell">{r.cargo || "—"}</td>
                    <td className="hidden p-3 text-[color:var(--text-muted)] lg:table-cell">{r.email || "—"}</td>
                    <td className="p-3">
                      {r.errors.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--success)" }}>
                          <CheckCircle2 className="size-3.5" /> Pronto
                        </span>
                      ) : (
                        <span className="inline-flex items-start gap-1 text-xs" style={{ color: "var(--error)" }}>
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {r.errors.join(" · ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <section className="rounded-xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] p-6">
          <h2 className="font-display text-lg font-semibold text-[color:var(--text-main)]">3. Resultado</h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            {result.created} Link Tree(s) criado(s).{" "}
            {result.failed.length > 0 && `${result.failed.length} falha(s).`}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--error)" }}>
              {result.failed.map((f) => (
                <li key={f.line}>Linha {f.line}: {f.message}</li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Button variant="outline" asChild>
              <Link to="/cartao/dashboard">Ver colaboradores</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
