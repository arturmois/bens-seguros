# Multi-Channel Chat — Guia de Configuração

Tutorial passo a passo para configurar cada canal de comunicação.

---

## 1. Web Chat Widget

Widget embedável no site da corretora. Visitantes preenchem nome + telefone e iniciam conversa em tempo real.

### 1.1 Criar canal no sistema

1. Acesse **Configurações > Canais**
2. Clique **Novo Canal**
3. Selecione tipo **WEB_CHAT**
4. Preencha:
   - **Nome**: Ex: "Chat do Site"
   - **Cor do widget**: código hex (default `#1f4b5f`)
   - **Mensagem de boas-vindas**: Ex: "Olá! Como podemos ajudar?"
   - **Origens permitidas**: domínios autorizados para embed (ex: `https://corretoraabc.com.br`)
5. Clique **Criar Canal**
6. Copie o **código de embed** que aparece

### 1.2 Instalar no site da corretora

Adicione uma única linha antes do `</body>` no HTML do site:

```html
<script
  src="https://chat.bensseg.com/widget/embed.js"
  data-channel-id="SEU_CHANNEL_ID"
  defer
></script>
```

O widget aparece automaticamente como botão flutuante no canto inferior direito.

### 1.3 Testar em desenvolvimento

```bash
# 1. Subir todos os apps
pnpm turbo dev

# 2. Buildar o widget
pnpm turbo build --filter=@app/widget

# 3. Abrir no browser
http://localhost:3002/widget-app/?channelId=SEU_CHANNEL_ID
```

### 1.4 Configurar AI Bot (opcional)

1. Acesse **Configurações > Agentes IA**
2. Crie ou selecione um agente
3. Em **Configurações > Canais**, edite o canal Web Chat
4. Vincule o agente IA ao canal
5. Novas conversas iniciam com o bot antes de escalar para humano

### 1.5 Verificação

| Item                     | Como verificar                                       |
| ------------------------ | ---------------------------------------------------- |
| Widget carrega           | Botão flutuante aparece no site                      |
| Lead capture funciona    | Formulário pede nome + telefone                      |
| Mensagem chega no painel | Conversa aparece em **Chat** com ícone de globo      |
| Operador responde        | Mensagem do operador aparece no widget em tempo real |

---

## 2. Facebook Messenger

Receba mensagens do Messenger da página da corretora no Facebook diretamente no painel.

### 2.1 Pré-requisitos

- Página no Facebook para a corretora
- Conta de desenvolvedor no [Meta for Developers](https://developers.facebook.com)
- Facebook App criado (se já tem para WhatsApp Meta, use o mesmo)

### 2.2 Criar Facebook App (se ainda não tem)

1. Acesse [Meta for Developers](https://developers.facebook.com) → **Meus Apps** → **Criar App**
2. Selecione tipo **Negócio**
3. Nomeie o app (ex: "Bens Seguros Chat")
4. Após criar, anote o **App ID** (visível no topo do painel)

### 2.3 Configurar App Secret na VPS

> **IMPORTANTE:** Faça este passo ANTES de configurar o webhook. Sem o App Secret correto, os webhooks retornam 401.

1. No Meta for Developers → seu App → **Configurações do app > Básico**
2. Clique **Mostrar** ao lado de **Chave Secreta do Aplicativo**
3. Copie o valor e configure na VPS:
   ```bash
   # No .env da VPS
   META_APP_SECRET=cole_a_chave_secreta_aqui
   ```
4. Reinicie os containers: `docker compose up -d chat-server chat-worker`

### 2.4 Adicionar Messenger ao App e gerar token

1. No painel do app → sidebar esquerda → **Casos de uso** → **Personalizar**
2. Selecione o caso de uso e navegue até **Configuração da API do Messenger**
3. Expanda **"2. Gere tokens de acesso"**
4. Clique **Adicionar Página** → selecione a página da corretora → autorize
5. Na linha da página, clique **Gerar** → copie o Page Access Token

> **Atenção:** Se você adicionar permissões ao app depois de gerar o token, o token NÃO herda as novas permissões automaticamente. Nesse caso, remova a página e adicione novamente para gerar um token atualizado.

### 2.5 Configurar Webhook

O webhook possui **duas partes** que devem ser configuradas separadamente:

#### Parte A — URL de Callback (nível do app)

1. Na mesma página de **Configuração da API do Messenger**, expanda **"1. Configure webhooks"**
2. Preencha:
   - **URL de callback**: `https://chat.bensseg.com/chat/webhook/meta`
   - **Verificar token**: o valor da env var `META_WEBHOOK_VERIFY_TOKEN`
3. Clique **Verificar e salvar**
4. Na tabela **Campos de webhook**, ative os switches:
   - `messages` → **Assinado**
   - `messaging_postbacks` → **Assinado**

#### Parte B — Assinatura da página (nível da página)

> **IMPORTANTE:** Esta etapa é frequentemente esquecida. Sem ela, a Meta não envia webhooks para a sua página específica.

1. Ainda na seção **"2. Gere tokens de acesso"**
2. Na linha da sua página, clique **Adicionar assinaturas**
3. No diálogo, marque:
   - `messages`
   - `messaging_postbacks`
4. Clique **Confirm**

A coluna "Assinatura do webhook" deve mostrar **"messages e messaging_postbacks"**.

### 2.6 Criar canal no sistema

1. Acesse **Configurações > Canais**
2. Clique **Novo Canal**
3. Selecione tipo **MESSENGER**
4. Preencha:
   - **Nome**: Ex: "Messenger Corretora"
   - **Page ID**: ID da página do Facebook
     - Para encontrar: Página do Facebook → **Configurações** → **Transparência da Página** → copie o número
     - Ou no Meta for Developers: na seção "Gere tokens de acesso", o ID aparece abaixo do nome da página
   - **Token**: o Page Access Token gerado no passo 2.4
5. Clique **Testar Conexão** — deve mostrar "Conectado: Page {ID}"
6. Clique **Criar Canal**

### 2.7 Verificação

| Item                   | Como verificar                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- |
| App Secret configurado | Container inicia sem erro `META_APP_SECRET is not configured`                      |
| Webhook ativo          | Meta mostra `messages` e `messaging_postbacks` como "Assinado"                     |
| Página inscrita        | Coluna "Assinatura do webhook" mostra os campos                                    |
| Mensagem chega         | Envie DM para a página no Facebook, conversa aparece no painel com ícone Messenger |
| Resposta funciona      | Responda pelo painel, mensagem chega no Messenger do cliente                       |

> **Nota sobre modo de desenvolvimento:** Durante o desenvolvimento (app não publicado), apenas administradores, desenvolvedores e testadores do app podem enviar mensagens. Adicione testadores em **Funções do app > Funções**.

---

## 3. Instagram DM

Receba DMs do Instagram profissional da corretora no painel.

### 3.1 Pré-requisitos

- Conta Instagram **Profissional** (Business ou Creator)
- Conta Instagram **conectada a uma Página do Facebook**
- Mesmo Facebook App configurado no passo 2 (Messenger)
- App Secret já configurado na VPS (passo 2.3)

### 3.2 Adicionar Instagram ao Facebook App

1. No Meta for Developers → seu App → sidebar → **Casos de uso** → **Personalizar**
2. Se o Instagram não está como caso de uso, vá em **Adicionar Produto** → **Instagram** → **Configurar**
3. Na seção **"Adicionar permissões obrigatórias"**, verifique que tem:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_manage_metadata`

### 3.3 Configurar Webhook para Instagram

Se já configurou o webhook no passo 2.5, a URL é compartilhada. Apenas ative os campos do Instagram:

1. Na configuração de webhooks do Instagram (ou na seção Page do Webhooks)
2. Ative o campo: `messages` → **Assinado**

### 3.4 Criar canal no sistema

1. Acesse **Configurações > Canais**
2. Clique **Novo Canal**
3. Selecione tipo **INSTAGRAM**
4. Preencha:
   - **Nome**: Ex: "Instagram @corretora_bens"
   - **Page ID**: ID da conta Instagram (**NÃO** é o App ID do Facebook)
     - Para encontrar: acesse [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
     - Selecione seu App e o **Page Token** da página vinculada ao Instagram
     - Execute: `GET /me?fields=id,username` (com o Page Token selecionado acima)
     - O `id` retornado (formato `17841xxxxx`) é o valor correto
   - **Token**: Page Access Token da **Página do Facebook vinculada ao Instagram** (**NÃO** é um token do Instagram)
     - Para gerar: use o mesmo token do Messenger se a página for a mesma, ou gere em **"Gere tokens de acesso"** para a página vinculada
5. Clique **Testar Conexão** — deve mostrar o @username da conta
6. Clique **Criar Canal**

### 3.5 Limitações do Instagram

| Limitação              | Descrição                                                     |
| ---------------------- | ------------------------------------------------------------- |
| **Janela de 24h**      | Só pode responder dentro de 24h da última mensagem do cliente |
| **Tipos de mídia**     | Apenas texto e imagem (sem áudio, vídeo, ou documento)        |
| **Story replies**      | Respostas a stories chegam como mensagem de texto             |
| **Conta profissional** | Conta pessoal não suporta API de mensagens                    |

### 3.6 Verificação

| Item              | Como verificar                                                                         |
| ----------------- | -------------------------------------------------------------------------------------- |
| Webhook ativo     | Meta mostra `messages` como "Assinado"                                                 |
| DM chega          | Envie DM para o Instagram da corretora, conversa aparece no painel com ícone Instagram |
| Resposta funciona | Responda pelo painel, mensagem chega no Instagram do cliente                           |

### 3.7 Troubleshooting (Messenger e Instagram)

| Erro                                       | Causa                                                        | Solução                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `META_APP_SECRET is not configured`        | Variável de ambiente não definida                            | Adicione no `.env` da VPS (passo 2.3) e reinicie containers                                                |
| `HMAC signature verification failed` (401) | App Secret incorreto ou desatualizado                        | Verifique em **Configurações do app > Básico > Chave Secreta** e atualize no `.env`                        |
| Webhook 200 mas mensagem não aparece       | Página não inscrita nos campos de webhook                    | Faça o passo 2.5 Parte B (Adicionar assinaturas à página)                                                  |
| `No active channel found`                  | Page ID no canal não bate com o ID enviado pelo webhook      | Corrija o Page ID. Para Instagram use `GET /me?fields=id,username`                                         |
| `Invalid OAuth access token`               | Token é do tipo errado (User Token vs Page Token)            | Gere um **Page Access Token** em "Gere tokens de acesso"                                                   |
| Validação falha: `pages_read_engagement`   | Permissão faltando (apenas Instagram, Messenger não precisa) | Adicione `pages_read_engagement` ao app, **remova e re-adicione a página** para gerar token com nova scope |
| `Received malformed Meta webhook payload`  | Imagem Docker desatualizada                                  | Faça deploy da imagem mais recente                                                                         |

> **Dica:** O App Secret (`META_APP_SECRET`) é compartilhado entre WhatsApp, Messenger e Instagram — todos usam o mesmo Facebook App.

---

## 4. WhatsApp (já existente)

Referência rápida dos canais WhatsApp já suportados.

### 4.1 WhatsApp via Baileys (QR Code)

1. **Configurações > Canais** → **Novo Canal** → tipo **WHATSAPP**, conexão **Baileys**
2. Clique **Conectar** → escaneie o QR Code com WhatsApp no celular
3. Ou use **Código de Pareamento**: insira o número e use o código no WhatsApp > Aparelhos Conectados

### 4.2 WhatsApp via Meta API (Oficial)

1. **Configurações > Canais** → **Novo Canal** → tipo **WHATSAPP**, conexão **Meta**
2. Preencha **Phone Number ID** e **Access Token** do WhatsApp Business API
3. Configure webhook: `https://chat.bensseg.com/chat/webhook/meta`

---

## 5. Painel do Operador — Inbox Unificado

Todas as conversas de todos os canais aparecem numa lista única.

### Identificação por canal

| Ícone                    | Canal     |
| ------------------------ | --------- |
| 🟢 (MessageCircle verde) | WhatsApp  |
| 🔵 (Globe teal)          | Web Chat  |
| 🔵 (Logo Messenger)      | Messenger |
| 🟣 (Logo Instagram)      | Instagram |

### Filtrar por canal

Use o dropdown **"ALL"** abaixo dos filtros de status (Todos, Fila, Meus, Fechados) para filtrar por canal específico.

### Fluxo de atendimento

1. Conversa nova chega na **Fila** (ou no **Bot** se AI configurado)
2. Operador clica na conversa → vê mensagens
3. Clica **Assumir** → status muda para **Atendendo**
4. Responde normalmente → mensagem entregue ao cliente no canal de origem
5. Clica **Finalizar** → conversa fechada

---

## 6. Deploy em Produção

### Build do widget

```bash
pnpm turbo build --filter=@app/widget
```

### Docker

Garantir que `apps/widget/dist/` esteja acessível ao chat-server. Opções:

**A) Mesmo container (padrão):**

```dockerfile
COPY apps/widget/dist /app/apps/widget/dist
```

**B) Path customizado:**

```env
WIDGET_DIST_PATH=/app/widget-dist
```

### Variáveis de ambiente

```env
# Compartilhadas por WhatsApp Meta, Messenger e Instagram (mesmo Facebook App):
META_WEBHOOK_VERIFY_TOKEN=seu_token_de_verificacao
META_APP_SECRET=seu_app_secret_do_facebook_app

# Opcional:
WIDGET_DIST_PATH=/caminho/custom/widget/dist
```

> **Nota:** `META_APP_SECRET` é o App Secret do Facebook App, usado para validação HMAC de todos os webhooks Meta (WhatsApp, Messenger, Instagram).

### Verificação pós-deploy

```bash
# Widget assets
curl -s -o /dev/null -w "%{http_code}" https://chat.bensseg.com/widget/embed.js
# → 200

# Widget SPA
curl -s -o /dev/null -w "%{http_code}" https://chat.bensseg.com/widget-app/
# → 200

# API do widget
curl -s -o /dev/null -w "%{http_code}" https://chat.bensseg.com/widget/config/CHANNEL_ID
# → 200

# Webhook Meta (verificação)
curl -s "https://chat.bensseg.com/chat/webhook/meta?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=test"
# → test
```
