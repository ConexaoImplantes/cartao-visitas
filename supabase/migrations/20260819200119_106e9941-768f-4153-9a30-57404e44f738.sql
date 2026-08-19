ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS foto_recortada_url text,
  ADD COLUMN IF NOT EXISTS foto_perfil_ajuste jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'foto_perfil.view' FROM public.user_permissions WHERE permission = 'dashboard.view'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'foto_perfil.download' FROM public.user_permissions WHERE permission = 'dashboard.view'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'foto_perfil.edit' FROM public.user_permissions WHERE permission = 'dashboard.edit'
ON CONFLICT DO NOTHING;