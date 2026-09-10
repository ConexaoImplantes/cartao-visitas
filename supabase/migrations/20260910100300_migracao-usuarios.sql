-- ============================================================
-- MIGRAÇÃO DE USUÁRIOS — Conexão Implantes
-- Gerado em: 2026-09-10 (UTC)
-- Origem: ambiente atual da aplicação
--
-- ATENÇÃO / SEGURANÇA
-- Este arquivo contém as senhas em formato criptografado (bcrypt).
-- Elas NÃO podem ser lidas, mas permitem que a pessoa continue
-- entrando com a MESMA senha no novo ambiente.
-- Trate este arquivo como confidencial: não publique, não versione,
-- e apague depois de usar.
--
-- COMO USAR
-- 1. Abra o novo ambiente e rode primeiro as migrações de estrutura
--    do projeto (tabelas user_roles, user_permissions, etc.).
-- 2. Rode este arquivo inteiro no SQL do novo ambiente.
-- 3. Peça para cada pessoa entrar com o e-mail e a senha de sempre.
-- ============================================================

BEGIN;

-- ---------- 1) Contas de acesso ----------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  '834c4a88-fb33-4bfd-81b7-c40857d4fa2f',
  'authenticated', 'authenticated',
  'hevertoneduardoperes@gmail.com',
  '$2a$06$rmrMNL2lWh5FxiqgohaSjOC/Z4QxUYvMjqgvYDDBrNpki3ipF018O',
  '2026-06-24 15:39:52.878529+00', '2026-06-24 15:39:52.878529+00', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '30a0abb8-e730-4c74-923f-b29b05e56bec',
  'authenticated', 'authenticated',
  'admin@conexao.com.br',
  '$2a$10$6z/Zq0Oc9pscG7K1kXvgJe/y/CPUuMAjzIlau.kjmB60pIIZy4Jgq',
  '2026-06-24 15:39:52.878529+00', '2026-06-24 15:39:52.878529+00', now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  'b80d21a5-934d-4d7d-b216-2d37a7a445bd',
  'authenticated', 'authenticated',
  'jmaciel@conexao.com.br',
  '$2a$10$cEyREPgRzUbJZlqxQDh6fOH2tOrdK.b1VT1h4kUGvNQJRQF6mW5v6',
  '2026-08-11 17:56:12.388358+00', '2026-08-11 17:56:12.370693+00', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email_verified":true}'::jsonb,
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- ---------- 2) Vínculo de identidade (login por e-mail) ----------
INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
SELECT
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
FROM auth.users u
WHERE u.id IN (
  '834c4a88-fb33-4bfd-81b7-c40857d4fa2f',
  '30a0abb8-e730-4c74-923f-b29b05e56bec',
  'b80d21a5-934d-4d7d-b216-2d37a7a445bd'
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i
  WHERE i.user_id = u.id AND i.provider = 'email'
);

-- ---------- 3) Papéis ----------
INSERT INTO public.user_roles (user_id, role) VALUES
('834c4a88-fb33-4bfd-81b7-c40857d4fa2f', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------- 4) Permissões ----------
INSERT INTO public.user_permissions (user_id, permission) VALUES
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.view'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.create'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.edit'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.toggle_status'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.view_qr'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.view_link'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.download_qr'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.download_card'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'dashboard.share'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'cartao_fisico.view'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'cartao_fisico.download'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'assinatura.view'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'assinatura.download'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'foto_perfil.view'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'foto_perfil.edit'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'foto_perfil.download'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'fluxo.view'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'fluxo.download_kit'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'importar.view'),
('30a0abb8-e730-4c74-923f-b29b05e56bec', 'tutoriais.view'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.view'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.create'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.edit'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.toggle_status'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.view_qr'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.view_link'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.download_qr'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.download_card'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'dashboard.share'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'cartao_fisico.view'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'cartao_fisico.download'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'assinatura.view'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'assinatura.download'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'foto_perfil.view'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'foto_perfil.edit'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'foto_perfil.download'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'fluxo.view'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'fluxo.download_kit'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'importar.view'),
('b80d21a5-934d-4d7d-b216-2d37a7a445bd', 'tutoriais.view')
ON CONFLICT (user_id, permission) DO NOTHING;

COMMIT;

-- Conferência rápida após rodar:
-- SELECT email FROM auth.users ORDER BY created_at;
