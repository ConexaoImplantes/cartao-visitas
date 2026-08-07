REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_super(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super(uuid) TO authenticated, service_role;