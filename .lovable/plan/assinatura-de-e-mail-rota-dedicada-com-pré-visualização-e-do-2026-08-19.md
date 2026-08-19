# Assinatura de E-mail — rota dedicada com pré-visualização e download PNG

Mesma estrutura da feature "Cartão de Visitas Físico", agora para a arte de assinatura de e-mail 150×50mm, com saída em PNG.

## O que será construído

**Nova rota `/cartao/assinatura`**, com botão no cabeçalho (ícone de e-mail) e um botão de atalho na coluna de Ações do dashboard, visível para quem tem permissão de dashboard.

Layout em duas colunas, idêntico em comportamento à rota do cartão físico:

```text
┌───────────────────────┬──────────────────────────────┐
│ Lista de colaboradores│  Preview da assinatura        │
│ [busca]               │  (proporção real 150x50mm)    │
│ ☑ Ana Souza           │                               │
│ ☑ Bruno Lima          │  ── Dados da assinatura ──    │
│ ☐ Carla Dias          │  Nome / Cargo                 │
│ [Selecionar todos]    │  Celular / E-mail / Slug      │
│                       │  [Salvar]                     │
│ [Baixar selecionados] │  [Baixar PNG]                 │
└───────────────────────┴──────────────────────────────┘
```

- **Preview fiel em HTML/CSS** com a mesma geometria usada na geração do PNG, QR Code real do link tree do colaborador e fundo padrão `ass-email-bg.png`.
- **Edição** de nome exibido, cargo, celular, e-mail e slug, salvos no registro do colaborador (mesmas validações já existentes).
- **Download individual** em PNG e **download em lote** dos selecionados (um PNG por colaborador, com indicador de carregamento).

## Composição fixa da arte (regras inegociáveis)

Proporção 150×50mm, exportada a 300 DPI (1772×591 px).

| Elemento | Fonte | Tamanho | Estilo | Cor |
|---|---|---|---|---|
| Nome | Open Sans | 16px | Bold | #ffffff |
| Cargo | Open Sans | 11px | Itálico | #c59937 |
| Celular | Arimo | 9px | Regular | #ffffff |
| E-mail | Arimo | 9px | Regular | #ffffff |

- Celular renderizado como `+DDI DDD NÚMERO` (ex.: `+55 11 98877-6655`), a partir dos dados já armazenados.
- QR Code do link tree posicionado à direita, conforme o modelo de referência.
- Posições de nome, cargo, ícones de telefone/e-mail/site e QR seguem o arquivo `ass-email-modelo.png`.

## Personalização do fundo

Nova aba **"Assinatura"** no editor de Tema, com o mesmo padrão já usado em Impressão:
- Upload de imagem 150×50mm, **ou** importação por link (Google Drive, Dropbox, OneDrive, URL direta), reaproveitando `src/lib/image-link.ts`.
- Fundo padrão embutido quando não houver substituição.

## Detalhes técnicos

- `ass-email-bg.png` publicado como asset CDN (`src/assets/ass-email-bg.png.asset.json`); `ass-email-modelo.png` usado apenas como referência visual, não embarcado.
- Fonte Arimo (Regular) adicionada como asset e carregada via `FontFace` no preview e no canvas de exportação.
- Novo `src/lib/email-signature.ts`: constantes de geometria (`SIGN_TRIM`, `SIGN_LAYOUT`), `loadSignatureOptions()` lendo o tema, e `renderSignaturePng()` desenhando em `<canvas>` (fundo, textos, QR) e exportando com `toBlob` — sem dependência de `pdf-lib`.
- Novo `src/components/email-signature-preview.tsx`: replica em HTML/CSS as mesmas constantes, garantindo que preview e PNG não divirjam.
- Nova rota `src/routes/_authenticated/cartao.assinatura.tsx` (`createFileRoute("/_authenticated/cartao/assinatura")`), com `validateSearch` para `id`, `head()` próprio e gating por `can("dashboard.view")` / edição por `can("dashboard.edit")`.
- `ThemeConfig.assinatura = { bgUrl: string }` adicionado em `src/lib/types.ts` com normalização e default — sem mudança de schema no banco.
- Item de navegação em `src/routes/_authenticated.tsx` e botão de atalho em `cartao.dashboard.tsx`.
