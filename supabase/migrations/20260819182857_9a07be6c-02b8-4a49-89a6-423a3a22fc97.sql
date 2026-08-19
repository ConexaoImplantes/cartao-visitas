INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'cartao_fisico.view' FROM public.user_permissions WHERE permission = 'dashboard.view'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'cartao_fisico.download' FROM public.user_permissions WHERE permission = 'dashboard.view'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'assinatura.view' FROM public.user_permissions WHERE permission = 'dashboard.view'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'assinatura.download' FROM public.user_permissions WHERE permission = 'dashboard.view'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'importar.view' FROM public.user_permissions WHERE permission = 'dashboard.create'
ON CONFLICT DO NOTHING;