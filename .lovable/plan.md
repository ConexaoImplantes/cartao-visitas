## Visão geral  
  
ESTRUTURE A APLICAÇÃO PARA SE TORNAR UM MÓDULO DENTRO DE UM ERP (APLICAÇÃO MAIOR) QUANDO NECESSÁRIO FOR

&nbsp;

Construir a SPA "Link Tree Corporativo" da Conexão Implantes em TanStack Start + Tailwind v4, com backend Lovable Cloud (Supabase gerenciado) já preparado para troca futura por um Supabase externo do cliente (toda config por env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — basta trocar valores).

## Etapas

### 1. Setup & Design System

- Ativar Lovable Cloud.
- Importar logo e favicon como assets (lovable-assets); favicon no `<head>` do `__root.tsx`.
- Reescrever `src/styles.css` com os 42 tokens do design system anexado (cores base, accent dourado `#c9a655`, gradiente metálico, sucesso/erro, surfaces dark `#0f172a`/`#1e293b`).
- Mapear tokens shadcn (`--background`, `--card`, `--primary`, `--destructive`, etc.) para os tokens da marca em `@theme inline`.
- Tipografia: Inter (base) + Playfair Display (display) via `@fontsource`.

### 2. Schema do banco (migration)

Tabelas em `public`, todas com GRANTs e RLS:

- `app_role` enum: `super_admin`, `admin`.
- `user_roles (id, user_id → auth.users, role)` + função `has_role(uuid, app_role) security definer`.
- `collaborators` — id uuid PK, nome, cargo, email, whatsapp, telefone_fixo, foto_url, status (`ativo`|`inativo`), created_at, created_by.
- `theme_config` — single-row (id text PK = 'global') com JSONB: background (solid|gradient + cores), tipografia (font/cor para nome, cargo, contato, institucional), ícones (pacote, cor path, cor bg circle), dados institucionais (nome empresa, endereço, links sociais).
- Storage bucket público `collaborator-photos`.

RLS:

- `collaborators`: SELECT público (rota pública precisa ler ativos) — policy `status = 'ativo'` para anon, full SELECT para authenticated. INSERT/UPDATE para authenticated (admin ou super_admin via `has_role`). DELETE só `super_admin`.
- `theme_config`: SELECT anon, UPDATE authenticated com role check.
- `user_roles`: SELECT authenticated; INSERT/UPDATE/DELETE bloqueados (gerenciado via seed/admin).

Seed: criar os dois usuários (`hevertoneduardoperes@gmail.com` super_admin; `admin@conexao.com.br` admin) via migration usando Auth Admin + `user_roles`, e um registro `theme_config` default.

### 3. Auth & rotas

- Email/senha apenas (sem Google) — credenciais fixas do PRD.
- `_authenticated/route.tsx` (managed) protege `/cartao/*`.
- Rotas:
  - `/login` — formulário email/senha, logo branca, toast de erro vermelho.
  - `/_authenticated/cartao/dashboard` — listagem + modal.
  - `/_authenticated/cartao/tema` — editor de tema com preview.
  - `/cartao/$id` — pública SSR-friendly (lê via server fn publishable).
- Redirect de `/` → `/login` (ou dashboard se autenticado).

### 4. Dashboard

- Header com título "Link Tree Corporativo" + botão dourado `+ Novo Colaborador`.
- Tabela: avatar circular, nome, cargo, email, badge status (verde/amarelo).
- Ações por linha: Visualizar (abre `/cartao/$id` nova aba), Editar (modal), Baixar QR (PNG via `qrcode` + canvas → download), Toggle status, Excluir (visível só se `hasRole('super_admin')`).
- Modal Novo/Editar:
  - Dropdown opcional para colaboradores já cadastrados sem link tree ativo (placeholder vazio na v1 — nenhum pré-cadastro fora do fluxo; UI presente para extensão futura).
  - Campos: nome, cargo, email (validar `@conexao.com.br`), whatsapp (máscara internacional), telefone fixo, foto (dropzone com preview, upload para Storage).
  - Submit "Gerar": cria registro com UUID, faz upload, gera QR apontando para `${window.location.origin}/cartao/${id}`.

### 5. Página pública `/cartao/$id`

- Server fn pública (publishable key) busca colaborador + theme global; throw `notFound()` se inexistente; se `inativo` → tela "Cartão temporariamente indisponível".
- Layout mobile-first 360–440px:
  - Foto circular grande, nome, cargo.
  - Botões CTA com ícones customizados via tema: WhatsApp (`https://wa.me/...`), Email (`mailto:`), Telefone (`tel:`), Site (`https://www.conexao.com.br`).
  - Footer: logo + nome + endereço à esquerda; ícones sociais (Instagram, LinkedIn, Facebook, YouTube) à direita.
- `head()` com OG/Twitter usando nome/cargo/foto.

### 6. Tela de Tema `/cartao/tema`

- Layout 2 colunas (desktop): esquerda formulários, direita preview ao vivo (iframe-like 390px renderizando o mesmo componente da página pública com um colaborador de exemplo).
- Seções:
  - Ícones de contato — seleção entre 2-3 pacotes (lucide variants), color picker para path e bg circle.
  - Background — toggle solid/gradient, color pickers.
  - Tipografias — para nome, cargo, contatos, dados institucionais: font-family (lista curada Google Fonts já carregadas via @fontsource) + cor.
  - Dados institucionais — nome, endereço, URLs sociais.
- Botão "Salvar" persiste em `theme_config` via server fn autenticada.

### 7. Geração de QR

- Pacote `qrcode` (renderiza em canvas hi-dpi); botão chama `QRCode.toDataURL(url, { width: 1024, margin: 2 })` e dispara download como `qrcode-{slug-nome}.png`.

### 8. Componentes técnicos

- `useAuth` hook (sessão Supabase) + `useRole` (chama RPC `has_role`).
- Server fns: `listCollaborators`, `upsertCollaborator`, `toggleStatus`, `deleteCollaborator` (verifica super_admin), `uploadPhoto`, `getPublicCollaborator`, `getTheme`, `saveTheme`.
- Validações com Zod em todas as entradas.

### 9. Portabilidade Supabase externo

- Toda integração usa `@/integrations/supabase/client` lendo env vars padrão (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Sem hardcode de URL/projeto.
- Migrations versionadas em `supabase/migrations` para replay em projeto externo.
- README curto explicando como apontar para Supabase próprio (trocar 2 env vars + rodar migrations + criar bucket).

## Notas técnicas

- Toda escrita protegida por RLS + checagem de role no client (UI) e via policies no DB.
- Página pública usa server fn com publishable key (não admin) e policy `anon` filtrada por `status='ativo'`.
- Storage: bucket público; URL completa salva em `collaborators.foto_url`.
- Toasts via `sonner` (já no projeto).
- Responsividade rigorosa (grid + min-w-0 conforme guideline).

## Fora de escopo (v1)

- Recuperação de senha / cadastro self-service (credenciais fixas).
- Pré-cadastro de colaboradores sem link tree (dropdown fica visível mas vazio até a feature ser adicionada).
- Múltiplos temas / override por colaborador.
- Analytics de cliques no link tree.