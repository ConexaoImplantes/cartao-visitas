# Foto de Perfil Corporativa (1080×1080)

Nova área para admin e super admin gerarem a foto de perfil institucional de cada colaborador: envio da foto, recorte automático do fundo, encaixe no modelo, pré-visualização, download, compartilhamento e uso como avatar do Link Tree.

## Como vai funcionar

Nova rota `/cartao/foto-perfil`, com o mesmo formato da rota de Cartão de Visitas: lista de colaboradores com busca e seleção à esquerda, pré-visualização e controles à direita. Um novo ícone na coluna de ações do Dashboard leva direto ao colaborador escolhido.

```text
┌───────────────────────┬──────────────────────────────┐
│ Lista de colaboradores│  Preview 1080x1080 (quadrado) │
│ [busca]               │  fundo + pessoa recortada     │
│ ☑ Ana Souza           │                               │
│ ☐ Bruno Lima          │  [Enviar foto] [PNG s/ fundo] │
│ [Selecionar todos]    │  Zoom ──────●───              │
│                       │  Horizontal ───●──            │
│ [Baixar selecionados] │  Vertical  ──●────            │
│                       │  [Baixar] [Compartilhar]      │
│                       │  [Usar no Link Tree]          │
└───────────────────────┴──────────────────────────────┘
```

### Envio e remoção de fundo
- O admin envia a foto do colaborador (JPG/PNG).
- O recorte do fundo acontece **no próprio navegador**, com IA local (sem custo por imagem e sem chave). O primeiro uso baixa o modelo (~20 MB) e leva alguns segundos; depois fica em cache.
- Alternativa sempre disponível: enviar um PNG que já venha sem fundo, pulando o recorte automático.

### Composição da arte
- Fundo padrão `fp-bg.png` (dourado com o círculo claro e a logo Conexão), substituível por upload 1080×1080 ou por link do Google Drive/Dropbox — mesma mecânica já usada nas outras artes.
- A pessoa é posicionada de forma determinística seguindo o modelo de referência: rosto centrado no quadrante 5 do grid 3×4, corpo ancorado na base da arte, ocupando a metade direita.
- Sliders de **zoom**, **posição horizontal** e **posição vertical** permitem corrigir fotos fora do padrão. Os ajustes ficam salvos por colaborador.

### Saídas
- **Baixar** PNG 1080×1080 do colaborador ativo.
- **Baixar selecionados** em lote (ZIP com um PNG por colaborador).
- **Compartilhar** com o colaborador (WhatsApp / e-mail), reaproveitando o padrão do diálogo já existente.
- **Usar como foto do Link Tree**: grava a arte completa 1080×1080 (versão reduzida e comprimida) como avatar do colaborador.

### Permissões
Novo grupo no painel de permissões do super admin:
- `foto_perfil.view` — acessar a rota
- `foto_perfil.edit` — enviar foto e ajustar enquadramento
- `foto_perfil.download` — baixar/compartilhar as artes

O ícone no Dashboard e o item de menu só aparecem para quem tem `foto_perfil.view`.

## Detalhes técnicos

- Assets novos via `lovable-assets`: `fp-bg.png` (fundo padrão) e `fp-bg-clean.png` (variante `Foto_perfil_v2.0-001.png`, oferecida como fundo alternativo).
- `src/lib/profile-photo.ts`: constantes de geometria (canvas 1080, caixa da pessoa, âncora do rosto derivada do grid de referência), composição via Canvas 2D e export PNG — mesmo padrão de `email-signature.ts`.
- `src/lib/background-removal.ts`: wrapper com import dinâmico de `@imgly/background-removal` (só carrega quando o admin clica em "remover fundo"), com fallback para PNG já recortado.
- `src/components/profile-photo-preview.tsx`: preview em canvas reativo aos sliders.
- Rota `src/routes/_authenticated/cartao.foto-perfil.tsx` (`createFileRoute("/_authenticated/cartao/foto-perfil")`) com `validateSearch` de `id`, `head()` próprio e item de navegação em `src/routes/_authenticated.tsx`.
- Persistência: migração adicionando a `collaborators` as colunas `foto_recortada_url` (PNG sem fundo) e `foto_perfil_ajuste` (JSONB com zoom/x/y); tema ganha `fotoPerfil: { bgUrl }` em `ThemeConfig`, com aba correspondente no editor de Tema.
- Imagens grandes: a foto recortada é reduzida antes de gravar; os PNGs 1080×1080 finais são gerados sob demanda no navegador, não armazenados.
- Chaves de permissão adicionadas em `src/lib/permissions.ts` + migração concedendo-as aos admins existentes.
- Dependências novas: `@imgly/background-removal` e `jszip` (download em lote).
