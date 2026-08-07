import { encodePhone, encodeTelefone } from "@/lib/types";

export interface ImportRow {
  line: number;
  nome: string;
  cargo: string;
  email: string;
  whatsapp: string;
  telefone_fixo: string | null;
  foto_url: string | null;
  status: "ativo" | "inativo";
  errors: string[];
}

export const CSV_HEADERS = [
  "nome",
  "cargo",
  "email",
  "whatsapp_ddi",
  "whatsapp_ddd",
  "whatsapp_numero",
  "telefone_tipo",
  "telefone_ddi",
  "telefone_ddd",
  "telefone_numero",
  "status",
  "foto_url",
] as const;

export const CSV_TEMPLATE = [
  CSV_HEADERS.join(";"),
  "Maria Silva;Consultora Comercial;maria.silva@empresa.com.br;55;11;98765-4321;fixo;55;11;3456-7890;ativo;",
  "João Souza;Gerente de Vendas;joao.souza@empresa.com.br;55;41;99999-1234;ramal;;;2045;ativo;",
].join("\n");

/** Minimal RFC4180-ish CSV parser supporting quotes and , or ; delimiters. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n")[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (s: string) => (s ?? "").replace(/\D/g, "");

function normalizeHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function mapRows(matrix: string[][]): { rows: ImportRow[]; missingHeaders: string[] } {
  const header = (matrix[0] ?? []).map(normalizeHeader);
  const required = ["nome", "cargo", "email", "whatsapp_ddd", "whatsapp_numero"];
  const missingHeaders = required.filter((h) => !header.includes(h));
  if (missingHeaders.length) return { rows: [], missingHeaders };

  const get = (cells: string[], key: string) => {
    const idx = header.indexOf(key);
    return idx === -1 ? "" : (cells[idx] ?? "").trim();
  };

  const seenEmails = new Set<string>();

  const rows = matrix.slice(1).map((cells, i) => {
    const errors: string[] = [];
    const nome = get(cells, "nome");
    const cargo = get(cells, "cargo");
    const email = get(cells, "email").toLowerCase();
    const wDdi = digits(get(cells, "whatsapp_ddi")) || "55";
    const wDdd = digits(get(cells, "whatsapp_ddd"));
    const wNum = digits(get(cells, "whatsapp_numero"));

    const tipoRaw = get(cells, "telefone_tipo").toLowerCase();
    const tipo = tipoRaw === "ramal" ? "ramal" : "fixo";
    const tDdi = digits(get(cells, "telefone_ddi")) || "55";
    const tDdd = digits(get(cells, "telefone_ddd"));
    const tNum = digits(get(cells, "telefone_numero"));

    const statusRaw = get(cells, "status").toLowerCase();
    const status: "ativo" | "inativo" = statusRaw === "inativo" ? "inativo" : "ativo";
    const fotoUrl = get(cells, "foto_url");

    if (!nome) errors.push("Nome obrigatório");
    if (nome.length > 120) errors.push("Nome muito longo");
    if (!cargo) errors.push("Cargo obrigatório");
    if (cargo.length > 120) errors.push("Cargo muito longo");
    if (!email) errors.push("E-mail obrigatório");
    else if (!EMAIL_RE.test(email) || email.length > 255) errors.push("E-mail inválido");
    else if (seenEmails.has(email)) errors.push("E-mail duplicado na planilha");
    else seenEmails.add(email);

    if (!wDdd || wDdd.length !== 2) errors.push("DDD do WhatsApp inválido");
    if (wNum.length < 8 || wNum.length > 9) errors.push("Número do WhatsApp inválido");
    if (fotoUrl && !/^https?:\/\//i.test(fotoUrl)) errors.push("Foto deve ser uma URL http(s)");

    let telefone: string | null = null;
    if (tipo === "ramal") {
      if (tNum) telefone = encodeTelefone({ kind: "ramal", ramal: tNum, phone: { ddi: "", ddd: "", number: "" } });
    } else if (tNum) {
      if (!tDdd || tDdd.length !== 2) errors.push("DDD do telefone inválido");
      telefone = encodePhone({ ddi: tDdi, ddd: tDdd, number: tNum });
    }

    return {
      line: i + 2,
      nome,
      cargo,
      email,
      whatsapp: encodePhone({ ddi: wDdi, ddd: wDdd, number: wNum }),
      telefone_fixo: telefone,
      foto_url: fotoUrl || null,
      status,
      errors,
    } satisfies ImportRow;
  });

  return { rows, missingHeaders: [] };
}
