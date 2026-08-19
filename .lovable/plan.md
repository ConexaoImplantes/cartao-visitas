# Foto de perfil: modo estático x modo em camadas

Dois modos claros na tela de Foto de Perfil, escolhidos pela origem da imagem.

## Modo estático (foto já definida no Link Tree)

- Quando o colaborador já tem foto no Link Tree, ela é carregada como imagem estática.
- Ao clicar em "Usar foto do Link Tree", a arte final é apenas essa foto em 1080x1080, preenchendo todo o quadrado (recorte central, tipo "cover") — sem moldura dourada, sem fundo `bg-foto.png`, sem sliders.
- Os controles de zoom / posição ficam ocultos nesse modo (não fazem sentido), e a pré-visualização mostra exatamente o que será baixado.
- Download, visualização em modal, download em lote e "usar no Link Tree" seguem o mesmo resultado estático.

## Modo em camadas (foto enviada e recortada)

- Ao enviar uma nova foto e remover o fundo (ou enviar PNG sem fundo), a arte volta a usar o template de 3 camadas: fundo `bg-foto.png` → pessoa recortada → moldura `dourado-foto.png`, com zoom e posicionamento.
- Existe um botão para voltar ao modo estático (usar de novo a foto do Link Tree) e vice-versa.

## Detalhes técnicos

- `src/lib/profile-photo.ts`: novo campo `mode: "estatico" | "camadas"` no input de composição. Em `estatico`, `composeProfilePhoto` desenha somente a imagem da pessoa em cover-crop 1080x1080 e ignora fundo e overlay.
- Persistência sem migração: o modo é gravado dentro do JSONB existente `foto_perfil_ajuste` (`{ zoom, x, y, mode }`); `normalizeFrame` passa a preservar/normalizar `mode`, com padrão `camadas` quando há recorte salvo e `estatico` quando a origem é a foto do Link Tree.
- `cartao.foto-perfil.tsx`: estado `mode` derivado da origem (Link Tree = estático, upload/recorte = camadas), sliders condicionais, badge indicando o modo ativo, e o mesmo modo aplicado no lote (lendo `foto_perfil_ajuste.mode` de cada colaborador).
- `ProfilePhotoPreview` recebe `mode` e repassa à composição.
- `src/lib/kit.ts` (ZIP do kit) usa a mesma função de composição, então herda o comportamento automaticamente.
