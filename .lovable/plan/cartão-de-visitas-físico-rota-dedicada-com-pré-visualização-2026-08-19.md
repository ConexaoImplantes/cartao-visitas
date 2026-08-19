# Cartão de Visitas Físico — rota dedicada com pré-visualização

Nova área para admin e super admin visualizarem as artes do cartão físico antes de baixar, ajustarem os dados do colaborador e gerarem PDFs individualmente ou em lote.

## Recomendação de pré-visualização

Preview em HTML/CSS durante a navegação e edição (instantâneo, reage a cada alteração) **mais** um botão "Ver PDF real" que abre o PDF gerado pela mesma engine de impressão. Assim a edição é fluida e a conferência final é 100% fiel ao arquivo que vai para a gráfica.

## O que será construído

**Nova rota `/cartao/cartao-fisico`**, com botão no cabeçalho (ícone de impressora), visível apenas para quem tem permissão de dashboard.

Layout em duas colunas:

```text
┌───────────────────────┬──────────────────────────────┐
│ Lista de colaboradores│  Preview frente / verso       │
│ [busca]               │  (proporção real 90x48mm)     │
│ ☑ Ana Souza           │                               │
│ ☑ Bruno Lima          │  ── Dados do cartão ──        │
│ ☐ Carla Dias          │  Nome no cartão               │
│ ...                   │  Cargo                        │
│ [Selecionar todos]    │  Slug (QR Code)               │
│                       │  [Salvar] [Ver PDF real]      │
│ [Baixar selecionados] │  [Baixar este cartão]         │
└───────────────────────┴──────────────────────────────┘
```

- **Lista com checkboxes** e busca por nome/cargo; clicar em um nome carrega o preview.
- **Preview fiel** de frente e verso, usando as mesmas artes configuradas na aba "Impressão" do Tema, com QR Code real do slug.
- **Edição dos dados do colaborador** usados no cartão: nome no cartão, cargo e slug — salvos direto no registro do colaborador (as mesmas regras de validação já existentes, incluindo unicidade do slug).
- **Downloads**: cartão individual (frente+verso) ou PDF em lote com todos os selecionados, com indicador de carregamento, reaproveitando a geração atual.
- O botão de impressão individual do dashboard continua funcionando; ganha também um atalho "Abrir no editor de cartão".

## Detalhes técnicos

- Rota `src/routes/_authenticated/cartao.cartao-fisico.tsx` (`createFileRoute("/_authenticated/cartao/cartao-fisico")`), item de navegação em `src/routes/_authenticated.tsx` com gating por `can("dashboard.view")` e edição por `can("dashboard.edit")`.
- Novo componente `src/components/print-card-preview.tsx`: replica em HTML/CSS a geometria de `src/lib/print-card.ts` (área de trim 90×48mm, posições de nome, cargo, QR e logo) a partir das mesmas constantes, evitando divergência.
- "Ver PDF real" chama `buildPrintCardsPdf` para um único item e abre o blob em nova aba; download em lote reutiliza a mesma função com o array selecionado.
- Sem mudanças de schema: usa `nome_cartao`, `cargo` e `slug` já existentes em `collaborators`.
- `head()` próprio na rota com título e descrição específicos.
