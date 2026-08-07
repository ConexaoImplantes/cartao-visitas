# Subdomínio próprio + métricas de acesso

Objetivo: links do tipo `cartao.conexaoimplantes.com.br/ana-vitoria` (curtos e com o nome do consultor) e registro de acessos/cliques de cada cartão.

## Parte 1 — Subdomínio próprio (Locaweb)

Nada a programar: o app já tem o campo "Domínio base" em Configurações, que é usado para gerar links e QR Codes. O que muda é a configuração:

1. Escolher o subdomínio (sugestão: `cartao.conexaoimplantes.com.br`).
2. No painel da Locaweb, criar um registro **A** com nome `cartao` apontando para `185.158.133.1`, mais o registro **TXT** de verificação que o Lovable exibir.
3. No projeto, em Configurações do projeto > Domínios, conectar `cartao.conexaoimplantes.com.br` e aguardar a validação/SSL.
4. Em **/cartao/configuracoes**, preencher o Domínio base com esse subdomínio. A partir daí todos os links e QR Codes já saem curtos.

Melhoria no app para apoiar isso:

- Na tela de Configurações, validar o domínio informado (formato) e mostrar um aviso quando ele for diferente do domínio em que o sistema está aberto, com um botão "Testar link" que abre um exemplo.

## Parte 2 — Registro de acessos e cliques

Nova tabela `card_events` guardando: cartão (id + slug), tipo do evento (`view`, `whatsapp`, `email`, `telefone`, `rede_social`), rótulo do alvo, data/hora, referenciador e origem (dispositivo). Sem dados pessoais do visitante.

Regras de acesso:

- Visitantes anônimos podem apenas **inserir** eventos (nunca ler).
- Somente usuários autenticados com permissão de dashboard podem ler.

Comportamento:

- A página pública registra um `view` ao abrir o cartão (uma vez por sessão do navegador, para não inflar números em recarregamentos).
- Cada botão (WhatsApp, e-mail, telefone, redes sociais) registra o clique antes de redirecionar; falha no registro nunca bloqueia o redirecionamento.

Onde aparecem as métricas:

- **Dashboard**: colunas/indicadores de visitas e cliques por colaborador, com filtro de período (7 / 30 / 90 dias / total).
- **Modal de compartilhamento**: resumo do cartão (visitas, cliques por canal).
- Exportação CSV das configurações passa a incluir totais de visitas e cliques.  
  
GERE O PASSO A PASSO COMPLETO DE CONFIGURAÇÃO DO SUBDOMÍNIO LOCAWEB

## Detalhes técnicos

- Migração: `public.card_events` (`id`, `collaborator_id` FK → collaborators, `slug`, `event_type`, `target`, `referrer`, `user_agent_kind`, `created_at`), índices por `collaborator_id` e `created_at`, GRANT `INSERT` para `anon`/`authenticated`, GRANT `SELECT` para `authenticated`, RLS habilitada com política de inserção pública e leitura via `has_permission(auth.uid(), 'dashboard.view')`.
- View/RPC agregadora `card_event_stats` (contagens por colaborador e por tipo) para o dashboard não baixar linha a linha.
- `src/lib/analytics.ts`: helpers `trackView(slug, collaboratorId)` e `trackClick(...)`, com `sessionStorage` para deduplicar a visualização.
- `src/routes/$slug.tsx` e `src/components/link-tree-card.tsx`: chamadas de tracking nos handlers existentes.
- `src/lib/settings.ts`: normalização/validação já existente reaproveitada para o aviso de domínio na tela de configurações.