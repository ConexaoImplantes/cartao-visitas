INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT up.user_id, v.permission
FROM public.user_permissions up
CROSS JOIN (VALUES ('fluxo.view'), ('fluxo.download_kit')) AS v(permission)
WHERE up.permission = 'dashboard.view'
ON CONFLICT DO NOTHING;