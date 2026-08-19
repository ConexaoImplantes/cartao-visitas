ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS kit_manual jsonb NOT NULL DEFAULT '{}'::jsonb;