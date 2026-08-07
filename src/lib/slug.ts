/** Palavras que não podem virar apelido de link (conflitam com rotas do sistema). */
export const RESERVED_SLUGS = new Set([
  "api",
  "assets",
  "admin",
  "cartao",
  "cartoes",
  "dashboard",
  "favicon",
  "importar",
  "login",
  "logout",
  "public",
  "robots",
  "sitemap",
  "static",
  "tema",
  "usuarios",
  "_",
]);

export function slugify(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Retorna mensagem de erro ou null quando o slug é válido. */
export function validateSlug(slug: string): string | null {
  if (!slug) return "Informe o apelido do link";
  if (slug.length < 3) return "Apelido muito curto (mín. 3 caracteres)";
  if (slug.length > 60) return "Apelido muito longo (máx. 60 caracteres)";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    return "Use apenas letras minúsculas, números e hífens";
  if (RESERVED_SLUGS.has(slug) || slug.startsWith("_"))
    return "Este apelido é reservado pelo sistema";
  return null;
}

/** Gera um slug único dado um conjunto de slugs já usados. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || "colaborador";
  if (!taken.has(root) && !RESERVED_SLUGS.has(root)) return root;
  let i = 2;
  while (taken.has(`${root}-${i}`) || RESERVED_SLUGS.has(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}
