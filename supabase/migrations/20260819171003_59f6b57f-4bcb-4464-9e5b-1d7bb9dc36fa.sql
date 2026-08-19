ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS nome_cartao text;

INSERT INTO public.user_permissions (user_id, permission)
SELECT user_id, 'dashboard.download_card'
FROM public.user_permissions
WHERE permission = 'dashboard.download_qr'
ON CONFLICT DO NOTHING;