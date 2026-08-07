ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS slug text;

WITH base AS (
  SELECT id,
    regexp_replace(
      regexp_replace(
        lower(translate(nome, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
        '[^a-z0-9]+', '-', 'g'),
      '^-+|-+$', '', 'g') AS s
  FROM public.collaborators
), numbered AS (
  SELECT id, CASE WHEN s = '' THEN 'colaborador' ELSE s END AS s,
         row_number() OVER (PARTITION BY CASE WHEN s = '' THEN 'colaborador' ELSE s END ORDER BY id) AS rn
  FROM base
)
UPDATE public.collaborators c
SET slug = CASE WHEN n.rn = 1 THEN n.s ELSE n.s || '-' || n.rn END
FROM numbered n
WHERE c.id = n.id AND c.slug IS NULL;

ALTER TABLE public.collaborators ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS collaborators_slug_unique ON public.collaborators (lower(slug));