
## Objetivo

Criar uma rota exclusiva do Super Admin para gerenciar credenciais de acesso e permissionar granularmente cada usuário por rota e por ação. Substituir o papel `admin` amplo pelo modelo de permissões granulares (Super Admin continua com acesso total automático).

## Modelo de permissões

Chaves no formato `rota.acao`:

- `dashboard.view` — abrir a lista de colaboradores
- `dashboard.create` — criar colaborador
- `dashboard.edit` — editar colaborador
- `dashboard.delete` — excluir colaborador
- `dashboard.toggle_status` — ativar/inativar
- `dashboard.download_qr` — baixar QR Code
- `dashboard.view_qr` — visualizar QR Code
- `dashboard.view_link` — abrir o link tree em nova aba
- `tema.view` — abrir a tela de tema
- `tema.edit` — salvar alterações no tema

A rota `usuarios` é exclusiva do Super Admin — não entra no modelo de permissões; só aparece e só é acessível para `super_admin`.

## Banco de dados (migration)

1. Nova tabela `public.user_permissions`:
   - `user_id uuid` (FK `auth.users`, on delete cascade)
   - `permission text` (chave do formato acima)
   - PK composta `(user_id, permission)`
   - GRANTs para `authenticated` (SELECT da própria linha) e `service_role` (ALL)
   - RLS: usuário lê apenas as próprias permissões; super_admin lê/escreve todas via policies usando `has_role`

2. Função `public.has_permission(_user_id uuid, _permission text) returns boolean` (SECURITY DEFINER), retorna `true` se for `super_admin` OU se existir linha em `user_permissions`.

3. Substituir uso do papel `admin` nas policies de `collaborators` e `theme_config`:
   - INSERT/UPDATE em `collaborators` → `has_permission(auth.uid(), 'dashboard.create')` / `'dashboard.edit'`
   - DELETE em `collaborators` → `has_permission(auth.uid(), 'dashboard.delete')` (super_admin entra automaticamente pela função)
   - UPDATE em `theme_config` → `has_permission(auth.uid(), 'tema.edit')`
   - Manter SELECT como está

4. Remover linhas `admin` de `user_roles` que não sejam super_admin e migrar para permissões equivalentes (ou deixar vazio para o Super Admin re-permissionar manualmente). Decisão: deixar vazio — o Super Admin reatribui pela nova tela.

## Server functions (`src/lib/users.functions.ts`)

Todas protegidas com `requireSupabaseAuth` + checagem `has_role(super_admin)` no handler. Carregam `supabaseAdmin` dentro do handler (`await import(...)`).

- `listManagedUsers()` — lista todos os usuários (Auth Admin `listUsers`) com suas permissões e papel.
- `createManagedUser({ email, password, permissions[] })` — cria usuário via `auth.admin.createUser` (email_confirm: true), insere permissões.
- `updateUserPermissions({ user_id, permissions[] })` — substitui o conjunto de permissões do usuário.
- `resetUserPassword({ user_id, password })` — `auth.admin.updateUserById`.
- `deleteManagedUser({ user_id })` — `auth.admin.deleteUser` (proíbe excluir super_admin e si mesmo).

## Frontend

### Hook de permissões
`src/hooks/use-permissions.tsx` — busca `user_permissions` do usuário logado uma vez; expõe `can(permission)` que retorna `true` automaticamente se for `super_admin`.

### Nova rota
`src/routes/_authenticated/cartao.usuarios.tsx`:
- `beforeLoad` redireciona para `/cartao/dashboard` se não for super_admin.
- Tabela: email, papel, badge com qtde de permissões, ações (Editar permissões, Resetar senha, Excluir).
- Botão "Novo Usuário" abre modal com email, senha (campo + gerar) e árvore de checkboxes agrupada por rota com "selecionar tudo" por seção.
- Modal "Editar permissões" reusa o mesmo painel de checkboxes.

### Navegação (`src/routes/_authenticated.tsx`)
Adicionar item "Usuários" no header, condicional a `isSuperAdmin`.

### Gates de UI

`src/routes/_authenticated/cartao.dashboard.tsx`:
- `beforeLoad`/`useEffect`: redireciona se não tiver `dashboard.view`.
- Botão "Novo Colaborador" só com `dashboard.create`.
- Botões "Editar", "Excluir", "Toggle status", "Baixar QR", "Visualizar QR", "Ver link tree" só renderizam com a respectiva permissão.

`src/routes/_authenticated/cartao.tema.tsx`:
- Redireciona sem `tema.view`.
- Botão "Salvar" desabilitado sem `tema.edit`.

## Detalhes técnicos

- `attachSupabaseAuth` já está registrado; novas server functions usam `requireSupabaseAuth` + verificação de role.
- `supabaseAdmin` carregado apenas dentro de handlers (server-only).
- Senhas: validação mínima 8 caracteres; campo com toggle mostrar/ocultar e botão "gerar" (16 chars aleatórios).
- Lista de chaves de permissão centralizada em `src/lib/permissions.ts` (constante única consumida pelo modal e pelo `can()`), para evitar divergência.
- `useAuth` continua expondo `isSuperAdmin`; `isAdminOrSuper` deixa de ser usado para gating (mantém-se apenas para retrocompatibilidade visual no header).

## Fora de escopo

- Convite por email / fluxo de reset self-service.
- Auditoria de mudanças de permissão.
- Permissionar a própria tela de Usuários (continua exclusiva do super_admin).
