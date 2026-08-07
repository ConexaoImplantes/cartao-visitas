# Link personalizado do colaborador

Trocar o link atual `.../cartao/<id-longo>` por um link limpo com o nome do consultor:

```text
conexao.com.br/joao-silva
```

## O que muda

1. **Cada colaborador ganha um "apelido de link" (slug)**
   - Gerado automaticamente a partir do nome: "João da Silva" -> `joao-silva` (sem acento, minúsculo, hífens).
   - Se já existir alguém com o mesmo slug, entra sufixo: `joao-silva-2`.
   - Campo editável no cadastro (criar/editar), com verificação de disponibilidade e aviso se já estiver em uso.
   - Na importação por CSV: coluna opcional `slug`; se vazia, gera pelo nome; conflitos são apontados na pré-visualização.

2. **Nova rota pública na raiz**
   - `conexao.com.br/joao-silva` abre o Link Tree.
   - Palavras reservadas bloqueadas para não conflitar com o sistema: `login`, `cartao`, `api`, `assets`, `admin`, `dashboard`, `tema`, `usuarios`, `importar`, `_`, etc. Essas ficam proibidas no formulário e na importação.
   - Se o slug não existir, mostra a página "Cartão não encontrado" já existente.

3. **QR Code, compartilhamento e dashboard**
   - Passam a usar o link novo em todos os lugares: botão "Visualizar", QR Code (gerar/baixar), diálogo de compartilhar (WhatsApp/e-mail/copiar).
   - Como combinado, os QR Codes antigos com ID **não** serão mantidos — todos devem ser regerados.

4. **Colaboradores já cadastrados**
   - Recebem slug automático pelo nome no momento da atualização do banco, então nenhum cadastro fica sem link.

## Domínio conexao.com.br (Locaweb)

O slug funciona imediatamente no endereço atual do projeto (`cartao-visitas.lovable.app/joao-silva`). Para ficar `conexao.com.br/joao-silva`, é preciso apontar o domínio (ou um subdomínio, ex.: `links.conexao.com.br`) para o projeto:

- Em Configurações do projeto > Domínios, conectar o domínio.
- Na Locaweb, criar os registros DNS informados ali (registro A apontando para o IP da Lovable + registro TXT de verificação), inclusive para `www`.
- Atenção: se `conexao.com.br` já hospeda o site institucional na Locaweb, apontar o domínio raiz para cá derruba o site atual. Nesse caso o recomendado é usar um subdomínio dedicado, por exemplo `links.conexao.com.br/joao-silva` ou `cartao.conexao.com.br/joao-silva`.

Sobre a ideia de um subdomínio por colaborador (`joao-silva.conexao.com.br`): exigiria DNS curinga e certificado curinga, com manutenção bem maior e sem ganho real de leitura frente a `conexao.com.br/joao-silva`. Recomendo não seguir por esse caminho.

## Detalhes técnicos

- Migração: coluna `slug text` em `collaborators`, índice único (case-insensitive), backfill dos registros existentes, `NOT NULL` ao final. Política de leitura anônima mantida (apenas `status = 'ativo'`).
- Nova rota `src/routes/$slug.tsx` (`ssr: false`, igual à atual), consultando `collaborators` por `slug`. Rota `/cartao/$id` removida.
- Helper de slug (normalização + lista de reservados) em `src/lib/slug.ts`; `src/lib/qr.ts` passa a montar a URL a partir do slug.
- Ajustes em `collaborator-modal.tsx`, `share-dialog.tsx`, `cartao.dashboard.tsx` e `csv-import.ts`.
