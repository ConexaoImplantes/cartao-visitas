# Cartão de visitas físico (PDF para impressão)

Novo recurso: gerar, para cada colaborador, um PDF pronto para gráfica do cartão de visitas 90x48 mm, com frente e verso, usando as artes enviadas.

## O que será entregue

1. **Novo campo "Nome no cartão físico"** no cadastro do colaborador (opcional). Quando vazio, usa o nome normal. Serve para encurtar nomes extensos e não quebrar o layout.
2. **Novo ícone "Baixar cartão para impressão"** na coluna Ações do Dashboard, disponível para Admin e Super Admin (nova permissão `dashboard.download_card`, liberada por padrão a quem já pode baixar QR Code).
3. **PDF gerado no clique**, com 2 páginas: página 1 = frente, página 2 = verso.

## Layout da frente (conforme o modelo enviado)

- Fundo: arte `bg-f-cv.png` cobrindo toda a página (incluindo sangria).
- QR Code do Link Tree do colaborador (mesma URL usada no compartilhamento), à esquerda, em quadrado branco.
- Nome (ou nome personalizado): Open Sans Bold, 11 pt, #FFFFFF.
- Cargo: Open Sans Itálico, 7 pt, #C59937.
- Logo horizontal Conexão (arte enviada) em tamanho pequeno e legível, alinhado abaixo do cargo.
- Site: Open Sans Itálico, 4,5 pt, #6A7070, ao lado do logo.

Verso: arte `bg-v-cv.png` (logo centralizado), sem dados variáveis.

## Preparação para impressão

- Formato final 90x48 mm + **3 mm de sangria em cada lado** (94x54 mm de página).
- **Marcas de corte** nos quatro cantos e margem de segurança interna de 3 mm (nenhum texto fora dela).
- Artes de fundo aplicadas em 300 DPI (as imagens enviadas já têm 1063x568 px, exatamente 300 DPI no tamanho do cartão).
- **Prova de cor**: barra de referência de cores (chapadas da marca — azul, dourado, branco, preto, escala de cinza) impressa fora da área de corte, junto com nome do colaborador e data de geração.
- Observação: o PDF é gerado em RGB (padrão da web). Se a gráfica exigir CMYK/perfil FOGRA, a conversão é feita por eles no pré-impressão — posso registrar esse aviso na tela de download.

## Detalhes técnicos

- Artes enviadas viram assets de CDN via `lovable-assets` (`bg-f-cv.png`, `bg-v-cv.png`, logo horizontal).
- Nova lib `src/lib/print-card.ts` usando `pdf-lib` + `@pdf-lib/fontkit` com a fonte Open Sans (Regular/Bold/Italic/BoldItalic) embutida; QR gerado em PNG por `qrcode` (já instalado) e embutido.
- Migração: coluna `nome_cartao text` em `collaborators`; permissão `dashboard.download_card` adicionada em `src/lib/permissions.ts` e concedida aos usuários que já possuem `dashboard.download_qr`.
- Botão no dashboard reaproveita o padrão `IconBtn`, com estado de carregamento enquanto o PDF é montado.

## Fora do escopo

- Impressão em lote (vários colaboradores num único PDF) — pode ser um passo seguinte se desejar.
