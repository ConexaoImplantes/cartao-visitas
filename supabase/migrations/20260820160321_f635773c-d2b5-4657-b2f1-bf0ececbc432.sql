INSERT INTO public.user_permissions (user_id, permission)
SELECT DISTINCT user_id, 'tutoriais.view' FROM public.user_permissions
ON CONFLICT DO NOTHING;