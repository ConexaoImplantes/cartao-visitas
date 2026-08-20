# Biblioteca de Tutoriais de Uso

Nova área `/cartao/tutoriais` com tutoriais passo a passo da plataforma: cada passo tem uma captura real da tela com destaque (highlight) no elemento a clicar, e os principais tutoriais também ganham uma versão em vídeo curto (screencast sintético, sem áudio).

## O que o usuário verá

**Biblioteca (`/cartao/tutoriais`)**
- Grade de cards, um por tutorial, com capa, título, número de passos, duração estimada e etiqueta de área (Dashboard, Fluxo, Foto, Assinatura, Cartão, Importação, Tema, Usuários).
- Busca por título/descrição e filtro por área.
- Marcação de "assistido" (guardada no navegador), com barra de progresso geral.
- Link para o manual em PDF já existente.

**Tutorial (`/cartao/tutoriais/$id`)**
- Player de passos: imagem grande com o highlight (contorno dourado + badge numerada + seta), título do passo, texto explicativo, navegação Anterior/Próximo e teclas de seta.
- Aba "Vídeo" quando o tutorial tem MP4, com o mesmo conteúdo em sequência automática.
- Lista lateral de passos clicável, e botão "Ir para a tela" que abre a rota real correspondente.

## Tutoriais previstos (fase 1)

1. Visão geral e navegação
2. Criar um colaborador (Link Tree corporativo)
3. Dashboard: busca, filtros, ordenação e ações
4. Fluxo guiado e download do Kit (ZIP)
5. Foto de perfil: usar a do Link Tree x criar em camadas
6. Assinatura de e-mail: gerar e baixar
7. Cartão de visitas físico: escolher modelo e gerar PDF
8. Importação em massa por CSV
9. Tema: fundo, ícones, tipografia, instituição
10. Usuários e permissões (somente super admin)
11. Kit público do colaborador (o que ele recebe)

## Como as capturas e vídeos são produzidos

Automação de navegador percorre a aplicação rodando localmente, com dados de demonstração, e captura a tela em cada passo. Um script aplica o highlight na região do elemento e monta o vídeo a partir da sequência de imagens (zoom suave no ponto de clique + legenda). O resultado é gravado como assets estáticos no projeto — nada é gerado em tempo de execução para o usuário final.

Se algum passo depender de dado sensível ou de estado que não dá para reproduzir com segurança, ele entra como passo ilustrado por recorte da interface, sem dados reais.

## Permissões

Novo grupo em `src/lib/permissions.ts`:
- `tutoriais.view` — acessar a biblioteca
- `tutoriais.manage` — reservado para edição/curadoria futura

Item "Tutoriais" adicionado à navegação (após "Config", ícone de ajuda/livro), condicionado a `tutoriais.view`. Migração no banco concede `tutoriais.view` a todos os perfis existentes, para ninguém perder acesso.

## Detalhes técnicos

- Rotas: `src/routes/_authenticated/cartao.tutoriais.tsx` (layout + biblioteca via `cartao.tutoriais.index.tsx`) e `cartao.tutoriais.$id.tsx`, com `head()` próprio em cada uma.
- Conteúdo dos tutoriais em `src/lib/tutorials.ts`: array tipado com `id`, `titulo`, `descricao`, `area`, `permissao` (para esconder tutoriais de rotas que o usuário não acessa), `rota`, `passos[{ titulo, texto, imagem, highlight? }]`, `video?`.
- Assets em `src/assets/tutoriais/` (PNG dos passos + MP4 opcional), importados por ES import.
- Highlight já "queimado" na imagem na geração; o player só exibe. Sem dependências novas no runtime da aplicação.
- Progresso de leitura em `localStorage` (`tutoriais.concluidos`), sem alteração de esquema além da migração de permissões.
- Componentes reutilizados: `Card`, `Tabs`, `Input`, `Badge`, `Progress`, `Dialog` do design system; cores e tipografia via tokens (dourado `#c59937`, Outfit).

## Fora de escopo nesta fase

- Narração em áudio e legendas em outros idiomas.
- Tour interativo sobreposto às telas reais (pode vir depois, reaproveitando o mesmo conteúdo de `tutorials.ts`).
- Edição dos tutoriais pela interface (conteúdo versionado em código).
