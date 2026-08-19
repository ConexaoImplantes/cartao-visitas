# Fluxo guiado do colaborador + Kit final em ZIP

Organizar a aplicação em um passo a passo lógico por colaborador e, ao final, entregar um único ZIP com todos os materiais e um PDF explicativo.

## Fluxo (4 etapas)

```text
1. Foto de perfil  ->  2. Link Tree corporativo  ->  3. Assinatura de e-mail  ->  4. Cartão de visitas  ->  Kit ZIP
```

Nova rota `/cartao/fluxo` (permissão própria, liberável pelo Super Admin):

- Lista de colaboradores com uma barra de progresso de 4 etapas por colaborador (concluída / pendente).
- Ao selecionar um colaborador, um assistente em etapas mostra, para cada passo, a pré-visualização da arte, o botão de ação (que leva à rota já existente daquela etapa, com o colaborador pré-selecionado) e o estado de conclusão.
- Navegação "Avançar / Voltar"; a etapa seguinte só fica ativa quando a anterior está concluída.
- Etapa 5 (Kit final) só habilita quando as 4 estiverem concluídas.

### Como cada etapa é considerada concluída

1. **Foto de perfil**: colaborador tem foto recortada + enquadramento salvo.
2. **Link Tree**: cadastro com nome, cargo, e-mail, telefone/WhatsApp e slug válidos, status ativo.
3. **Assinatura**: dados necessários preenchidos (celular e e-mail) — arte é gerada sob demanda.
4. **Cartão de visitas**: modelo escolhido (novo/antigo) confirmado para o colaborador.

O dashboard ganha uma coluna/indicador compacto com o mesmo progresso e um atalho para o fluxo.

## Kit ZIP

Botão "Baixar kit completo" (na etapa final e também no dashboard, para quem tiver permissão). Conteúdo:

- `foto-perfil-<nome>.png` — 1080x1080
- `assinatura-<nome>.png` — 1772x591 px (150x50 mm a 300 dpi)
- `cartao-visitas-<nome>.pdf` — modelo escolhido, com sangria e marcas de corte
- `qrcode-linktree-<nome>.png` — QR do Link Tree
- `COMO-USAR-<nome>.pdf` — manual explicativo personalizado

### PDF explicativo (gerado com pdf-lib, identidade Conexão)

- Capa com nome, cargo e data.
- Link Tree corporativo: URL do colaborador, QR Code, onde divulgar (bio de redes, e-mail, WhatsApp).
- Foto de perfil: como aplicar no WhatsApp Business, LinkedIn e Teams/Google.
- Assinatura de e-mail: passo a passo para Gmail e Outlook (inserir a imagem e apontar o link).
- Cartão de visitas: como enviar à gráfica (90x48 mm, 3 mm de sangria, 300 dpi, conversão CMYK pela gráfica).

Também será possível baixar o kit de vários colaboradores de uma vez (um ZIP com uma pasta por colaborador).

## Detalhes técnicos

- Nova rota `src/routes/_authenticated/cartao.fluxo.tsx` + item "Fluxo" na navegação, com gating por permissão.
- Novo grupo de permissões em `src/lib/permissions.ts`: `fluxo.view` e `fluxo.download_kit`, concedidos por padrão a quem já tem `dashboard.view` / downloads, com migração para usuários existentes.
- Nova lib `src/lib/kit.ts`: calcula o status das 4 etapas, monta o ZIP com `jszip` reutilizando `profilePhotoBlob`, `renderSignaturePng`, `buildPrintCardsPdf` e `src/lib/qr.ts`.
- Nova lib `src/lib/kit-guide.ts`: gera o PDF explicativo com `pdf-lib` + fontes Open Sans já embutidas no projeto.
- Sem mudanças de schema: o status é derivado dos campos já existentes em `collaborators`.
