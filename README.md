# Conexão Link Hub

# Documento de Requisitos do Produto (PRD)

**Projeto:** Gerador Corporativo de Link Tree Inteligente

**Cliente:** Conexão Implantes

**Arquivos de Referência do Sistema:** `favicon.png` | `Logo_Conexão_horizontal_texto_branco.png`

---

## 1. Visão Geral do Produto e Objetivos

Este produto consiste em uma aplicação web SPA (Single Page Application) focada em simplificar e centralizar a identidade digital dos colaboradores da **Conexão Implantes**. Através desta plataforma, administradores podem gerar cartões de visita virtuais personalizáveis em formato "Link Tree", exportar QR Codes dinâmicos correspondentes e gerenciar a exibição pública de canais corporativos oficiais de comunicação de maneira segura e centralizada.

### Objetivos do Negócio

* **Padronização de Marca:** Garantir que toda a comunicação digital dos consultores e colaboradores respeite estritamente o manual de identidade visual da empresa.


* **Facilidade de Acesso:** Permitir o compartilhamento instantâneo de dados através do escaneamento rápido de QR Codes dinâmicos por clientes ou parceiros de negócio.
* **Autonomia de Design:** Oferecer flexibilidade para customizar paletas de cores, tipografias e backgrounds diretamente pela rota de personalização global, alterando em lote ou individualmente a renderização visual das páginas finais.

---

## 2. Personas e Matriz de Permissões (RBAC)

A aplicação conta com dois perfis de usuários com restrições rígidas baseadas em papéis de controle (Role-Based Access Control).

### 2.1 Credenciais Predefinidas (Ambiente Conexão 2026)

* **SUPER ADMIN:** `hevertoneduardoperes@gmail.com` / `@#Khen741963`
* **ADMIN DA EMPRESA:** `admin@conexao.com.br` / `Conexao@2026`

### 2.2 Tabela de Níveis de Acesso (RBAC)

| Funcionalidade / Operação | Super Admin (`God Mode`) | Admin da Empresa |
| --- | --- | --- |
| Autenticar-se no Sistema | Sim | Sim |
| Visualizar Dashboard (`/cartao/dashboard`) | Sim | Sim |
| Cadastrar Novo Colaborador / Link Tree | Sim | Sim |
| Editar Dados do Colaborador | Sim | Sim |
| Baixar QR Code do Link Tree | Sim | Sim |
| **Inativar / Reativar Link Tree (Status)** | Sim | Sim |
| **Deletar Registros do Banco de Dados** | **Sim** | **NÃO (Bloqueado)** |
| Alterar Configurações Globais de Tema (`/cartao/tema`) | Sim | Sim |

---

## 3. Arquitetura de Rotas da Aplicação

A navegação da SPA deve implementar rigorosamente as quatro rotas abaixo utilizando o gerenciador de rotas interno do framework (React Router / Lovable Router):

* `url_aplicacao/login`: Tela de autenticação unificada para Super Admin e Admin.
* `url_aplicacao/cartao/dashboard`: Painel principal contendo métricas, listagem completa de Link Trees gerados e controles operacionais.
* `url_aplicacao/cartao/tema`: Ambiente de personalização em tempo real das propriedades estéticas, layouts e design system dos cartões.
* `url_aplicacao/cartao/$id_colaborador`: Rota pública de exibição (Renderização) do Link Tree responsivo customizado do colaborador com base no seu identificador único de banco de dados.

---

## 4. Requisitos Funcionais por Módulo e Especificação de Telas

### 4.1 Tela de Login (`/login`)

* **UI/UX:** Layout minimalista, focado, com fundo escuro utilizando o token `--color-bg` (#0f172a). Centralizado na tela deve constar o card contendo o logotipo institucional (`Logo_Conexão_horizontal_texto_branco.png`).


* **Campos de Entrada:**
* E-mail (Validação nativa de formato RFC 5322).
* Senha (Campo do tipo `password` com ícone de alternância de visibilidade/olho).


* **Comportamento:** Ao submeter credenciais válidas, mapear o tipo de perfil ativo na sessão e redirecionar imediatamente para a rota `/cartao/dashboard`. Credenciais incorretas disparam notificações flutuantes (Toasts) utilizando o token de erro `--color-error` (#ef4444).



### 4.2 Tela de Dashboard (`/cartao/dashboard`)

* **Cabeçalho Esquerdo:** Título principal em destaque: `Link Tree Corporativo` (utilizando o token `--color-text-main` - #f8fafc). Subtítulo descritivo logo abaixo contextualizando a listagem de cartões digitais configurados.


* **Cabeçalho Direito:** Botão de Ação Primária texturizado com a label `+ Novo Colaborador` ou `Novo` utilizando o background dourado `--color-btn-primary-bg` (#c9a655).


* **Grid / Tabela de Dados:** Exibe todos os Link Trees criados na organização. Cada linha da listagem deve conter:
* Avatar/Foto pequena de visualização circular, Nome Completo, Cargo, E-mail do colaborador e Status do Link (Badge indicando Ativo em verde `--color-success` ou Inativo em amarelo/vermelho).


* **Coluna de Ações Disponíveis:**
1. *Botão Visualizar:* Redireciona o gestor para a rota pública do colaborador (`/cartao/$id_colaborador`) em uma nova aba do navegador.
2. *Botão Editar:* Abre o modal preenchido com as informações atuais do respectivo colaborador para modificações imediatas.
3. *Botão Baixar QR Code:* Inicia o download direto da imagem PNG do QR Code gerado para o colaborador em alta definição.
4. *Chave de Alternância (Toggle Status):* Ativa ou Inativa o link instantaneamente.
5. *Botão Excluir (Ícone de lixeira):* Disponível visivelmente apenas para a credencial Super Admin. Para a credencial Admin da empresa, este botão fica ocultado ou explicitamente desabilitado por regra de negócio.





#### 4.2.1 Modal de Inserção / Edição de Dados (Trigger: Botão "Novo")

Quando o botão superior direito do dashboard é clicado, um modal centralizado com overlay escuro (`--color-overlay` - #00000080) é instanciado na tela com os seguintes fluxos internos:

* **Seletor Inteligente de Contexto:** No topo do modal, haverá um campo Dropdown (`<select>`) condicional. Ele lista os colaboradores já pré-cadastrados no banco de dados da empresa que **ainda não possuem** uma configuração de Link Tree ativa. Se selecionado, preenche os inputs do modal automaticamente. Se o usuário optar por criar um registro do zero, prossegue preenchendo os campos manuais.
* **Campos Requeridos no Formulário:**
* `Nome Completo` (String)
* `Cargo Corporativo` (String)
* `E-mail Institucional` (Email válido `@conexao.com.br`)
* `Número de WhatsApp` (Telefone com máscara internacional incluindo código de área)
* `Telefone Fixo ou Ramal` (String numérico com formato padronizado)
* `Foto do Colaborador` (Área de Dropzone para upload de imagem ou input do tipo arquivo com preview instantâneo).


* **Fluxo de Salvamento e Geração Automatizada:**
Ao acionar o botão de submissão **"Gerar"**, o sistema realiza atomicamente duas ações automatizadas em background:
1. **Persistência e Tokenização:** Cria um registro único para o colaborador no banco de dados gerando um UUID randômico e seguro (`$id_colaborador`).
2. **Geração do QR Code Dinâmico:** Um gerador de QR Code do lado do cliente (ex: `qrcode.react`) cria uma matriz escaneável apontando exatamente para a URL destino final da aplicação concatenada ao ID gerado: `url_aplicacao/cartao/$id_colaborador`.



### 4.3 Tela de Personalização e Temas (`/cartao/tema`)

Painel administrativo dividido em uma área lateral de formulários com seletores (Color Pickers, inputs e seletores de fontes) e uma área de viewport direita que funciona como um espelho de Preview responsivo em tempo real simulando uma tela de dispositivo móvel.

As propriedades customizáveis dividem-se nas seguintes categorias manipuláveis:

* **Customização de Ícones (Canais de Contato):**
* Seleção de pacotes gráficos de ícones para representar o WhatsApp, E-mail, Telefone Fixo e o Site Institucional.
* Definição cromática: Input do tipo Color Picker para alterar a cor dos caminhos vetoriais dos ícones e a cor de background/circulo envolvente individual de cada um.


* **Estilização do Plano de Fundo Global (Page Background):**
* Alternador de modo: Opção para escolher entre cor sólida estável ou gradiente dinâmico de duas ou mais cores.
* Seletores gráficos de cor para definir os códigos HEX aplicados ao fundo do Link Tree.


* **Personalização de Textos e Tipografias:**
* Controles específicos para dados do colaborador (Nome, Cargo, Informações de contato) e dados institucionais (Nome da empresa, Endereço e Links de redes sociais).
* Cada campo de texto expõe opções dinâmicas para: Alteração da Família Tipográfica (Font-Family base do sistema ou Google Fonts importadas) e Cor da Fonte (Color Picker).



### 4.4 Tela de Visualização Pública do Link Tree (`/cartao/$id_colaborador`)

Rota totalmente responsiva otimizada prioritariamente para visualização em aparelhos Mobile (Smartphones corporativos). Se o Link Tree consultado estiver marcado com o status de "Inativo" no painel, a aplicação exibe uma tela limpa de erro informando indisponibilidade temporária. Estando ativo, renderiza a seguinte hierarquia visual:

* **Topo da Página:** Renderização proeminente e centralizada da foto de perfil do colaborador com moldura circular estilizada.
* **Camada de Identificação:** Logo abaixo da foto, exibe o Nome Completo do colaborador em tipografia de destaque e, logo abaixo, o Cargo Corporativo configurado.
* **Seção de Conexões e Links (Área Central):**
Lista vertical contendo blocos interativos de CTA (Call To Action) estilizados conforme as regras salvas na rota de Tema. Cada bloco exibe o respectivo ícone customizado à esquerda e o texto descritivo. O comportamento de clique ativa redirecionamentos nativos:
* *Botão WhatsApp:* Dispara deep link direto abrindo o aplicativo mensageiro externo: `[https://wa.me/num_whatsapp](https://wa.me/num_whatsapp)`.
* *Botão E-mail:* Ativa gatilho nativo de envio do sistema operacional (Desktop ou Mobile): `mailto:email_colaborador@conexao.com.br`.
* *Botão Telefone Fixo / Ramal:* Dispara evento de chamada padrão em dispositivos móveis: `tel:numero_telefone`.
* *Botão Site da Empresa:* Abre a página institucional da Conexão Implantes em nova guia do navegador: `[https://www.conexao.com.br](https://www.conexao.com.br)`.


* **Rodapé Unificado da Marca (Footer):**
* *Canto Inferior Esquerdo:* Exibição do logo institucional oficial (`Logo_Conexão_horizontal_texto_branco.png`) posicionado ao lado do Nome da Empresa e do Endereço Físico completo da sede.


* *Canto Inferior Direito:* Alinhamento horizontal composto por ícones de atalho clicáveis para acesso rápido às Redes Sociais Oficiais da empresa (Instagram, LinkedIn, Facebook, YouTube).



---

## 5. Especificações de Design System Integrado (Conexão Implantes)

O motor de renderização da interface administrativa e dos elementos padrão do Link Tree deve herdar estritamente os tokens de estilo do CSS declarados no ecossistema da marca:

### Paleta de Cores e Variáveis Estruturais

* **Fundo de Telas Administrativas (`--color-bg`):** `#0f172a` (Dark Slate Blue moderno).


* **Superfícies de Cards e Modais (`--color-surface`):** `#1e293b`.


* **Texto Principal (`--color-text-main`):** `#f8fafc`.


* **Texto Secundário (`--color-text-muted`):** `#94a3b8`.


* **Elemento Accent (Dourado de Destaque Conexão):** `--color-accent` com valor HEX `#c9a655`.


* **Efeito Hover no Accent:** `--color-accent-hover` com valor HEX `#d4b366`.


* **Gradiente Assinatura Metálico Corporativo:** Implementado via CSS linear-gradient cruzando os pontos das variáveis de início `#c9a655`, meio `#e8d48b` e fim `#a8873a`.


* **Favicon da Aplicação:** Associar o arquivo local `favicon.png` como ícone de aba do navegador no cabeçalho HTML global.



---

## 6. Diretrizes Técnicas para Geração Automática com Lovable

Para assegurar o funcionamento completo da aplicação baseando-se apenas neste prompt estruturado no Lovable, o interpretador de código deve assegurar que:

1. **Estados Globais (Context / Store):** Criar um contexto de estado centralizado em memória simulando as tabelas do banco de dados (Tabela de Colaboradores, Tabela de Configurações de Tema Global, Tabela de Sessão de Usuário Autenticado) alimentada com dados mockados iniciais realistas para que a plataforma já inicie 100% funcional, interativa e populada.
2. **Segurança em Código:** Proteger rotas internas através de um componente Wrapper de Rotas Autenticadas (`ProtectedRoute`). Caso um usuário não autenticado tente forçar entrada nas rotas `/cartao/*`, redirecionar imediatamente para a rota `/login`.
3. **Biblioteca de Ícones Integrada:** Utilizar referências diretas do pacote Lucide-React ou FontAwesome para a renderização limpa dos ícones parametrizáveis de redes sociais e contatos telefônicos nas viewports públicas e de edição.
4. **Responsividade Impecável:** Empregar classes utilitárias do Tailwind CSS de modo que todo o fluxo do Dashboard seja visualizado com maestria em telas Desktop Full HD e os cartões de visita finais renderizem-se com excelência estética em telas de proporção mobile de 360px a 440px de largura.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cartao-visitas.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f262b4c3-48a6-4717-8591-280256e07057).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
