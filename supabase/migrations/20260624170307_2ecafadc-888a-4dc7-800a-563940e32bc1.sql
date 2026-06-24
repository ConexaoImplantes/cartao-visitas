
-- 1) user_permissions table
CREATE TABLE public.user_permissions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- writes done via service_role inside server functions; no insert/update/delete policies for authenticated

-- 2) has_permission function (super_admin auto-grants everything)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id AND permission = _permission
    );
$$;

-- 3) replace admin-based policies with permission-based ones
DROP POLICY IF EXISTS "Admins can insert collaborators" ON public.collaborators;
DROP POLICY IF EXISTS "Admins can update collaborators" ON public.collaborators;
DROP POLICY IF EXISTS "Only super admin can delete collaborators" ON public.collaborators;

CREATE POLICY "Can insert collaborators with permission"
  ON public.collaborators FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'dashboard.create'));

CREATE POLICY "Can update collaborators with permission"
  ON public.collaborators FOR UPDATE TO authenticated
  USING (
    public.has_permission(auth.uid(), 'dashboard.edit')
    OR public.has_permission(auth.uid(), 'dashboard.toggle_status')
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'dashboard.edit')
    OR public.has_permission(auth.uid(), 'dashboard.toggle_status')
  );

CREATE POLICY "Can delete collaborators with permission"
  ON public.collaborators FOR DELETE TO authenticated
  USING (public.has_permission(auth.uid(), 'dashboard.delete'));

DROP POLICY IF EXISTS "Admins can upsert theme insert" ON public.theme_config;
DROP POLICY IF EXISTS "Admins can upsert theme update" ON public.theme_config;

CREATE POLICY "Can insert theme with permission"
  ON public.theme_config FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(auth.uid(), 'tema.edit'));

CREATE POLICY "Can update theme with permission"
  ON public.theme_config FOR UPDATE TO authenticated
  USING (public.has_permission(auth.uid(), 'tema.edit'))
  WITH CHECK (public.has_permission(auth.uid(), 'tema.edit'));

-- 4) Remove non-super_admin 'admin' roles so granular permissions take over
DELETE FROM public.user_roles WHERE role = 'admin'::app_role;
