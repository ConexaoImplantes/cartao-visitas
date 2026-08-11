CREATE OR REPLACE FUNCTION public.tg_collaborator_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base text;
  candidate text;
  i int := 2;
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    base := lower(regexp_replace(unaccent_fallback(NEW.nome), '[^a-zA-Z0-9]+', '-', 'g'));
    base := btrim(base, '-');
    IF base = '' OR base IS NULL THEN base := 'colaborador'; END IF;
    base := left(base, 60);
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.collaborators c WHERE lower(c.slug) = candidate AND c.id IS DISTINCT FROM NEW.id) LOOP
      candidate := left(base, 55) || '-' || i;
      i := i + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.unaccent_fallback(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT translate(
    t,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  );
$$;

DROP TRIGGER IF EXISTS trg_collaborators_slug ON public.collaborators;
CREATE TRIGGER trg_collaborators_slug
BEFORE INSERT OR UPDATE ON public.collaborators
FOR EACH ROW EXECUTE FUNCTION public.tg_collaborator_slug();