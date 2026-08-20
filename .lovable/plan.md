# Foto de perfil sob demanda + regra de publicação do Kit Digital

## O problema real

Hoje o "concluído" de uma etapa mistura duas coisas diferentes:

1. **A etapa foi cumprida** (o admin fez / dispensou o trabalho)
2. **O material existe e pode ser gerado** (há dados/arquivos para produzir o PNG/PDF)

O `kit_manual` (marcação manual do admin) força o item 1 para `true`, e o kit público usa esse mesmo sinal como se fosse o item 2. Para Link Tree, assinatura e cartão isso funciona por acaso — esses materiais são gerados a partir de campos de cadastro. Para a **foto de perfil não funciona**: sem `foto_recortada_url` não existe imagem da pessoa, então marcar a etapa como concluída libera o kit com um card de foto que gera uma arte vazia (só fundo).

Somando ao pedido de tirar a foto do formulário do Link Tree, o cadastro deixa de produzir qualquer foto — o que torna o furo acima a regra, não a exceção.

## Modelo proposto

Separar os dois conceitos em cada etapa:

- `done` — etapa cumprida (automático **ou** manual). Serve para o painel do fluxo guiado e para a barra de progresso.
- `deliverable` — o arquivo realmente pode ser gerado. **Nunca** pode ser satisfeito por marcação manual quando depende de um arquivo binário (foto).

Para a foto, a marcação manual do admin muda de significado: em vez de "considere feita", passa a existir uma escolha explícita entre

- **Concluída** — só fica disponível quando existe `foto_recortada_url` (não é marcável à mão).
- **Dispensada deste kit** — o colaborador não terá foto de perfil corporativa; o card some do kit público e do ZIP, e o kit pode ser publicado sem ela.

Assim o kit público continua com a regra "só abre quando completo", sem nunca oferecer um material que não existe.

## O que muda na prática

**1. Formulário de criação/edição do colaborador**
- Remover o campo de upload de foto. A foto passa a ser responsabilidade exclusiva da rota Foto de Perfil.
- `foto_url` continua sendo lido (registros antigos), mas não é mais alimentado por esse formulário.

**2. Fluxo guiado**
- No card da etapa Foto, o botão de marcação manual vira duas opções: *Dispensar foto* / *Reativar*. As demais etapas mantêm o comportamento atual de marcação manual.
- A ação em lote de "marcar tudo como concluído" deixa de tocar a etapa Foto (ou passa a dispensá-la explicitamente, com aviso no diálogo).
- Indicador visual distinto para "dispensada" (cinza/ traço) versus "concluída" (verde).

**3. Kit público `/{slug}/kit`**
- Continua bloqueado enquanto o kit não estiver completo.
- Etapa dispensada conta como resolvida para liberar o kit, mas o card da foto **não é renderizado** e o arquivo não entra no ZIP.
- Se por qualquer motivo o material não puder ser gerado, o card mostra o estado "em preparação" em vez de baixar um arquivo quebrado.

**4. Geração do ZIP e manual em PDF**
- O ZIP pula a foto quando dispensada.
- O PDF do manual omite (ou substitui por nota) a seção 2 nesse caso, para não instruir sobre um arquivo inexistente.

**5. Dashboard**
- A coluna/badge de progresso do kit reflete o novo estado (`3/3` quando a foto foi dispensada, em vez de `3/4`).

## Detalhes técnicos

- `src/lib/kit.ts`: `KitStatus.steps[k]` ganha `deliverable: boolean` e `skipped: boolean`; `ready` passa a exigir `done` em todas as etapas não dispensadas; `completed`/total passam a considerar o total efetivo.
- A dispensa é gravada no mesmo JSON `kit_manual` (`{ foto: "dispensada" }` ou uma chave `skip`), evitando migração de schema; `manualSteps` normaliza valores legados `true`.
- `buildKitFiles` / `downloadKitZip` filtram por `deliverable`.
- `src/routes/$slug.kit.tsx` usa `deliverable` para decidir renderizar o card, e não mais `status.steps.foto.done`.
- `src/components/collaborator-modal.tsx`: remoção do bloco de upload e do estado `foto`.

## Fora de escopo

- Não muda o pipeline de remoção de fundo (local + fallback remove.bg) nem o layout das artes.
- Não altera o schema do banco.
