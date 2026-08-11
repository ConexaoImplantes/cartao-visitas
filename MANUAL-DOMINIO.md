# Manual completo — Domínio e subdomínio personalizado nos projetos Lovable

Domínio principal: **conexao.com.br** (registrado/hospedado na Locaweb)
Aplicação atual: Gerador Corporativo de Link Tree — Conexão Implantes

---

## 1. Resposta rápida às duas dúvidas

### 1.1 Configuro para cada projeto individualmente ou globalmente?

**Cada projeto Lovable é publicado separadamente e recebe seu próprio endereço.** Não existe uma
chave única que aponte automaticamente todos os projetos para `conexao.com.br`. Portanto:

- Para **cada projeto** você conecta um **subdomínio diferente** (ex.: `cartao.conexao.com.br`,
  `app.conexao.com.br`, `catalogo.conexao.com.br`).
- O trabalho na Locaweb é feito **uma vez por subdomínio** (um registro A + um registro TXT).
- O único recurso "global" existente é o **Branded app URLs** (planos Business/Enterprise), que troca
  o sufixo padrão `*.lovable.app` por algo como `*.apps.conexao.com.br` para todos os projetos do
  workspace. Mesmo assim, cada projeto continua tendo seu próprio nome antes do ponto.

**Recomendação:** um subdomínio por projeto. Nunca aponte o domínio raiz `conexao.com.br` para o
Lovable enquanto o site institucional estiver hospedado na Locaweb — isso derrubaria o site atual.

### 1.2 Qual opção escolher na tela da Locaweb do print?

A tela **"Gerenciar domínios → Novo Domínio"** é o **Gerenciador de Domínios** da hospedagem
Locaweb. Ela serve para **hospedar** domínios/subdomínios dentro da própria Locaweb — **não** é o
caminho para o Lovable. As quatro opções que ela **exige** escolher significam (definições oficiais
da Locaweb):

| Opção na Locaweb | O que faz de verdade | Serve para o Lovable? |
|---|---|---|
| **Apontamento** | Apresenta o **mesmo conteúdo do site principal** (funciona como espelho) e cria um registro A apontando para os **servidores da Locaweb** | **Não** — aponta para a Locaweb, não para o IP `185.158.133.1` do Lovable |
| **Redirecionamento** | Redireciona o endereço para um site externo/blog/rede social; a barra do navegador **troca** para a URL de destino | **Não** — você perderia o subdomínio bonito na barra de endereço |
| **Página em construção** | Exibe a mensagem "Em construção" padrão da Locaweb | **Não** — é só um placeholder |
| **Conteúdo de pasta** | Exibe o conteúdo de uma pasta do servidor da Locaweb (apenas subdomínios) | **Não** — serve pasta interna da Locaweb |

Nenhuma das quatro cria um **registro A apontando para o IP `185.158.133.1`** do Lovable. Todas
apontam para a infraestrutura da própria Locaweb. Por isso **nenhuma** delas serve para o Lovable.

**O caminho correto é a Zona de DNS** ("entradas de DNS"), descrita no **Passo 3** abaixo. É nela que
você adiciona o **registro A** e o **registro TXT** que o Lovable exige para validar e emitir o SSL.

> **E se a Locaweb obrigar a "registrar" o subdomínio primeiro?** Algumas versões do painel exigem
> passar pelo "Novo Domínio" antes de liberar a edição do DNS. Nesse caso, escolha **Página em
> construção** (o placeholder mais inofensivo), conclua o cadastro e vá à Zona de DNS. Lá, **apague
> o registro A automático** que a Locaweb criou para `cartao` e **adicione o registro A →
> `185.158.133.1`** + o TXT `_lovable` (Passo 3). **Nunca** use "Apontamento" nem "Redirecionamento".

---

## 2. Planejamento dos subdomínios

Defina antes de mexer no DNS. Sugestão:

| Projeto | Subdomínio | Link final do colaborador |
|---|---|---|
| Link Tree Corporativo | `cartao.conexao.com.br` | `cartao.conexao.com.br/ana-vitoria` |
| Projeto futuro 2 | `app.conexao.com.br` | — |
| Projeto futuro 3 | `portal.conexao.com.br` | — |

Regras:

- Use apenas letras minúsculas, números e hífen.
- Um subdomínio só pode estar conectado a **um** projeto Lovable por vez.
- Evite subdomínios já em uso na Locaweb (`www`, `mail`, `webmail`, `ftp`, `smtp`, `imap`, `pop`).
  Mexer neles quebra e-mail e site institucional.

---

## 3. Passo a passo detalhado (por projeto)

### Passo 1 — Publicar o projeto

O domínio personalizado só fica disponível depois da primeira publicação.

1. No editor do projeto, clique em **Publish** (canto superior direito; no celular, `...` → Publish).
2. Aguarde ~1 minuto até o endereço `seu-projeto.lovable.app` responder.

### Passo 2 — Iniciar a conexão do domínio no Lovable

1. Clique no nome do projeto (canto superior esquerdo) → **Settings**.
2. Vá em **Project → Domains**.
3. Clique em **Connect Domain**.
4. Digite o subdomínio completo, por exemplo: `cartao.conexao.com.br` — e confirme.
5. A tela passa a exibir os registros DNS necessários. **Deixe esta aba aberta**; você vai copiar
   os valores exatos no próximo passo.

Registros normalmente exibidos:

```text
Tipo: A     Nome: cartao         Valor: 185.158.133.1
Tipo: TXT   Nome: _lovable       Valor: lovable_verify=<código exclusivo do seu projeto>
```

> Use sempre o valor TXT mostrado na sua tela. Ele é único por projeto.

### Passo 3 — Criar os registros na Zona de DNS da Locaweb

> ⚠️ **Use a Zona de DNS** ("entradas de DNS"), **NÃO** o "Novo Domínio" do Gerenciador de Domínios.
> A tela do "Novo Domínio" (com Apontamento / Redirecionamento / Página em construção / Conteúdo de
> pasta) é para hospedar dentro da Locaweb e **não** cria o registro A que o Lovable precisa. A
> Zona de DNS é onde você adiciona entradas DNS "cruas" (A, TXT) — exatamente o que o Lovable exige.

1. Acesse o **Painel da Locaweb** (Minha Conta) com o login administrativo.
2. Menu **Domínios** → selecione **conexao.com.br**.
3. Abra a **Zona de DNS** (também chamada *Administrar DNS*, *Entradas de DNS* ou *Editor de zona
   DNS* — o nome varia conforme o painel). **Não** clique em "Novo Domínio / Adicionar Domínio".
4. Clique em **Adicionar Entrada** e crie o **registro A**:
   - Tipo de entrada: `A`
   - Nome/Host: `cartao` (somente o prefixo — a Locaweb completa com `.conexao.com.br`)
   - Valor/Destino: `185.158.133.1`
   - TTL: padrão (3600) ou o menor permitido
   - Clique em **Salvar Configurações**.
5. Clique novamente em **Adicionar Entrada** e crie o **registro TXT**:
   - Tipo de entrada: `TXT`
   - Nome/Host: `_lovable`
   - Valor: `lovable_verify=<código copiado do Lovable>` (cole exatamente, sem aspas extras)
   - TTL: padrão
   - Clique em **Salvar Configurações**.
6. **Confirmar o resultado** — na lista de entradas da Zona de DNS devem aparecer exatamente:
   - `cartao` → **A** → `185.158.133.1`
   - `_lovable` → **TXT** → `lovable_verify=...`
7. **Salvar tudo** e aguardar a propagação (até 48 h; costuma estabilizar em minutos).

> **Se a Locaweb obrigou a escolher um tipo no "Novo Domínio" antes de liberar a Zona de DNS:**
> escolha **Página em construção** e conclua o cadastro do `cartao`. Depois abra a Zona de DNS,
> **exclua** qualquer registro A que a Locaweb tenha criado automaticamente para `cartao`
> (normalmente aponta para o servidor de hospedagem dela) e **adicione** o registro A →
> `185.158.133.1` + o TXT `_lovable` acima. O objetivo final é que `cartao` tenha **apenas** o
> registro A do Lovable e o TXT de verificação — nada da Locaweb.

> **Conflito de registros:** se já existir um registro A, CNAME ou "apontamento" para o mesmo
> prefixo `cartao`, **remova o antigo**. Dois registros conflitantes para o mesmo nome impedem a
> validação do Lovable.

### Passo 4 — Voltar ao Lovable e validar

1. Retorne à aba **Settings → Project → Domains**.
2. O status passará por: **Verifying** → **Setting up** → **Active**.
3. Se ficar parado, clique em **Retry** / **Complete Setup**.
4. A propagação de DNS costuma levar de 15 minutos a algumas horas (limite formal: 72h).
5. Quando ficar **Active**, o SSL (https) é emitido automaticamente pela Lovable.

### Passo 5 — Definir o domínio base dentro do sistema (específico deste projeto)

Depois de o domínio ficar ativo:

1. Entre no sistema como **Super Admin**.
2. Vá em **Configurações → Domínio e link público**.
3. Preencha **Domínio base** com `cartao.conexao.com.br` e clique em **Salvar**.
4. A partir daí, todos os links copiados, compartilhamentos e **QR Codes** passam a usar o novo
   endereço. **QR Codes impressos com o endereço antigo devem ser regerados.**

### Passo 6 — Repetir para os demais projetos

Para cada novo projeto: publique → conecte um subdomínio diferente → crie na Locaweb **um novo
registro A** com aquele prefixo e **um novo registro TXT** com o código daquele projeto.
O registro `_lovable` pode ter múltiplos valores TXT (um por projeto) — adicione, não substitua.

---

## 4. Alternativas de configuração

| Cenário | Como fazer | Observação |
|---|---|---|
| Subdomínio por projeto (**recomendado**) | Registro A + TXT na Zona de DNS por subdomínio | Site institucional intacto |
| Domínio raiz `conexao.com.br` no Lovable | A em `@` + A em `www` + TXT `_lovable` | **Derruba o site atual da Locaweb** |
| Locaweb com Cloudflare na frente | Marcar "Domain uses Cloudflare or a similar proxy" em Advanced | Validação por CNAME |
| Comprar domínio novo curto | Settings → Domains → **Buy new domain** | Conecta sozinho, plano pago |
| Sufixo único do workspace | Workspace Settings → **Branded app URLs** | Business/Enterprise |

---

## 5. Status possíveis do domínio no Lovable

| Status | Significado | Ação |
|---|---|---|
| Action required | Fluxo iniciado e não concluído | Clicar em **Complete Setup** |
| Verifying | Aguardando propagação do DNS | Aguardar |
| Setting up | Verificado, emitindo SSL | Aguardar |
| Ready | DNS correto, projeto não publicado | Publicar |
| Active | Domínio no ar | Nada |
| Offline | DNS foi alterado e não bate mais | Corrigir registros na Locaweb |
| Failed | SSL não emitido | Checar CAA e clicar em **Retry** |
| Removed | Mesmo domínio foi ligado a outro projeto | Reconectar |

---

## 6. Solução de problemas

- **"Não sei qual das 4 opções escolher na Locaweb":** nenhuma das quatro (Apontamento,
  Redirecionamento, Página em construção, Conteúdo de pasta) serve para o Lovable. Use a
  **Zona de DNS** e crie um **registro A** → `185.158.133.1`. Veja o Passo 3.
- **A Locaweb obriga a passar pelo "Novo Domínio":** escolha **Página em construção**, conclua,
  vá à Zona de DNS, apague o A automático da Locaweb e adicione o A do Lovable.
- **Não valida após 72h:** confira o IP `185.158.133.1` e se o Nome do registro é só `cartao`
  (não `cartao.conexao.com.br.` duplicado).
- **Registro duplicado:** apague apontamentos, CNAMEs ou A antigos do mesmo prefixo.
- **SSL falhou:** se existir registro **CAA** no domínio, ele precisa liberar a Let's Encrypt.
- **E-mail parou:** você alterou algum registro MX/TXT do domínio raiz. Restaure MX, SPF, DKIM e
  DMARC originais da Locaweb — o Lovable não exige nenhuma mudança neles.
- **Conferir propagação:** use https://dnschecker.org consultando o tipo A para o subdomínio.
- **Link antigo:** o endereço `*.lovable.app` continua funcionando em paralelo ao subdomínio.

---

## 7. Checklist de execução

- [ ] Lista de subdomínios definida (um por projeto)
- [ ] Projeto publicado no Lovable
- [ ] "Connect Domain" concluído com o subdomínio correto
- [ ] **Zona de DNS** aberta na Locaweb (NÃO o "Novo Domínio")
- [ ] Registro A criado: `cartao` → `185.158.133.1`
- [ ] Registro TXT `_lovable` criado com o código do projeto
- [ ] Registros conflitantes antigos removidos (A/CNAME da Locaweb para `cartao`)
- [ ] Status **Active** com SSL emitido
- [ ] Campo "Domínio base" preenchido em Configurações
- [ ] QR Codes regerados e redistribuídos
- [ ] Site institucional e e-mails testados após a mudança

---

*Documento gerado para uso interno da Conexão Implantes.*
