
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin')
  );
$$;

-- ============ COLLABORATORS ============
CREATE TABLE public.collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cargo text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  telefone_fixo text,
  foto_url text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collaborators TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collaborators TO authenticated;
GRANT ALL ON public.collaborators TO service_role;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active collaborators"
  ON public.collaborators FOR SELECT TO anon
  USING (status = 'ativo');

CREATE POLICY "Authenticated can read all collaborators"
  ON public.collaborators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert collaborators"
  ON public.collaborators FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update collaborators"
  ON public.collaborators FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Only super admin can delete collaborators"
  ON public.collaborators FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_collaborators_updated
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ THEME CONFIG ============
CREATE TABLE public.theme_config (
  id text PRIMARY KEY,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.theme_config TO anon;
GRANT SELECT, INSERT, UPDATE ON public.theme_config TO authenticated;
GRANT ALL ON public.theme_config TO service_role;
ALTER TABLE public.theme_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read theme"
  ON public.theme_config FOR SELECT USING (true);

CREATE POLICY "Admins can upsert theme insert"
  ON public.theme_config FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can upsert theme update"
  ON public.theme_config FOR UPDATE TO authenticated
  USING (public.is_admin_or_super(auth.uid()))
  WITH CHECK (public.is_admin_or_super(auth.uid()));

INSERT INTO public.theme_config (id, config) VALUES ('global', '{
  "background": {"mode":"gradient","solid":"#0f172a","gradientFrom":"#0f172a","gradientTo":"#1e293b","gradientAngle":160},
  "icons": {"pack":"lucide","pathColor":"#0f172a","bgColor":"#c9a655"},
  "typography": {
    "nome": {"font":"Playfair Display","color":"#f8fafc"},
    "cargo": {"font":"Inter","color":"#c9a655"},
    "contato": {"font":"Inter","color":"#f8fafc"},
    "institucional": {"font":"Inter","color":"#94a3b8"}
  },
  "institucional": {
    "nomeEmpresa": "Conexão Implantes",
    "endereco": "Av. Principal, 1000 - São Paulo, SP",
    "site": "https://www.conexao.com.br",
    "instagram": "https://instagram.com/conexaoimplantes",
    "linkedin": "https://linkedin.com/company/conexaoimplantes",
    "facebook": "https://facebook.com/conexaoimplantes",
    "youtube": "https://youtube.com/@conexaoimplantes"
  }
}'::jsonb);

-- ============ SEED USERS ============
-- Cria os dois usuários e atribui papéis. Idempotente.
DO $$
DECLARE
  v_super_id uuid;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_super_id FROM auth.users WHERE email = 'hevertoneduardoperes@gmail.com';
  IF v_super_id IS NULL THEN
    v_super_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_super_id, 'authenticated', 'authenticated',
      'hevertoneduardoperes@gmail.com', crypt('@#Khen741963', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_super_id, v_super_id::text,
      format('{"sub":"%s","email":"%s"}', v_super_id, 'hevertoneduardoperes@gmail.com')::jsonb,
      'email', now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_super_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@conexao.com.br';
  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'admin@conexao.com.br', crypt('Conexao@2026', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_admin_id, v_admin_id::text,
      format('{"sub":"%s","email":"%s"}', v_admin_id, 'admin@conexao.com.br')::jsonb,
      'email', now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
