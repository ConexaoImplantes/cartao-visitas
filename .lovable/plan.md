# Kit digital do colaborador (página pública)

Nova rota pública `/{apelido}/kit` (ex.: `cartao.conexao.com.br/joao-silva/kit`) onde o próprio colaborador acessa e baixa todos os seus materiais, sem login e sem acesso ao painel administrativo.

## O que o colaborador vê na página

Cabeçalho com o nome, cargo e a marca Conexão, seguido de quatro blocos:

1. **Foto de perfil** — visualização da arte 1080x1080 e botão "Baixar PNG" (para WhatsApp, LinkedIn e Teams).
2. **Link Tree corporativo** — pré-visualização do cartão digital, link copiável, QR Code exibido na tela e botão para baixar o QR em PNG.
3. **Assinatura de e-mail** — visualização da arte 150x50 mm e botão "Baixar PNG".
4. **Cartão de visitas** — visualização do PDF (frente e verso, no modelo escolhido pelo administrador) e botão "Baixar PDF".

No topo e no rodapé:

- **Baixar kit completo (ZIP)** — mesmo pacote gerado no fluxo administrativo (manual + foto + assinatura + cartão + QR Code).
- **Manual de regras e bom uso (PDF)** — abre em modal dentro da própria página, com botão de download.

Todas as visualizações acontecem em modal dentro da plataforma, seguindo a regra já adotada nas rotas administrativas.

## Regras de acesso e estados

- Página aberta por link direto, no mesmo padrão do Link Tree (que já é público).
- Colaborador inativo ou apelido inexistente: mensagem amigável de "kit indisponível", sem expor dados.
- Materiais ainda não concluídos pelo administrador (ex.: foto de perfil não enviada) aparecem como bloco desabilitado com o aviso "ainda em preparação pelo time de Marketing", em vez de erro.
- Nenhum dado editável: a página é somente leitura/download.

## Como o administrador compartilha

- Nova ação "Compartilhar kit" na rota **Fluxo** e no Dialog de compartilhamento do Dashboard: copia o link do kit e oferece envio por WhatsApp e e-mail com texto pronto.
- O link do kit também entra no manual em PDF do próprio kit.

## Manual de regras e bom uso

Nova seção acrescentada ao PDF já existente, contendo:

- Uso obrigatório da arte oficial, sem filtros, molduras, recortes ou alterações de cor.
- Proibição de editar textos, trocar fontes ou combinar as artes com outras marcas.
- Onde cada material deve ser aplicado e onde não deve.
- Orientação sobre atualização: mudanças de cargo, telefone ou e-mail devem ser solicitadas ao Marketing, que regenera os materiais.
- Contato do time responsável.

## Detalhes técnicos

- Nova rota `src/routes/$slug.kit.tsx` (`ssr: false`), lendo `collaborators` por `slug` e `theme_config` global com o cliente público — mesmas permissões de leitura já usadas por `src/routes/$slug.tsx`.
- Reaproveita `src/lib/profile-photo.ts`, `src/lib/email-signature.ts`, `src/lib/print-card.ts`, `src/lib/qr.ts` e `src/lib/kit.ts` (`loadKitOptions`, `kitStatus`, `downloadKitZip`) — a geração continua acontecendo no navegador, sem duplicar lógica.
- Reaproveita `ArtViewerDialog` para os modais de imagem e PDF.
- `src/lib/kit-guide.ts` ganha a seção "Regras e bom uso" e o link do kit.
- Registro de acesso: evento `kit_view` em `card_events`, para o Dashboard medir quantos colaboradores abriram o kit.
- `head()` próprio da rota com título e descrição específicos e `robots: noindex` (o kit não deve ser indexado por buscadores).
