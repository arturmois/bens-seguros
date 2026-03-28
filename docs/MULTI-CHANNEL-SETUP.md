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

### 2.2 Criar Facebook App

1. Acesse [Meta for Developers](https://developers.facebook.com) → **Meus Apps** → **Criar App**
2. Selecione tipo **Negócio**
3. Nomeie o app (ex: "Bens Seguros Chat")
4. No painel do app, clique **Adicionar Produto** → **Messenger** → **Configurar**

### 2.3 Gerar Page Access Token

1. Em **Messenger > Configurações** → seção **Tokens de Acesso**
2. Clique **Adicionar ou remover Páginas**
3. Selecione a página da corretora
4. Clique **Gerar Token** → copie o token gerado
5. Para token de longa duração (não expira):
   - Use o [Graph API Explorer](https://developers.facebook.com/tools/explorer/) para trocar por um token de longa duração
   - Ou use a API: `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_TOKEN}`

### 2.4 Configurar Webhook

1. Em **Messenger > Configurações** → seção **Webhooks**
2. Clique **Adicionar URL de Callback**
3. Preencha:
   - **URL de Callback**: `https://chat.bensseg.com/chat/webhook/meta`
   - **Token de Verificação**: o valor da env var `META_WEBHOOK_VERIFY_TOKEN` (compartilhada por WhatsApp, Messenger e Instagram)
4. Clique **Verificar e Salvar**
5. Em **Campos de Webhook**, ative:
   - `messages`
   - `messaging_postbacks`

### 2.5 Criar canal no sistema

1. Acesse **Configurações > Canais**
2. Clique **Novo Canal**
3. Selecione tipo **MESSENGER**
4. Preencha:
   - **Nome**: Ex: "Messenger Corretora"
   - **Page ID**: ID da página do Facebook (encontre em Configurações da Página > Transparência)
   - **Access Token**: o Page Access Token gerado no passo 2.3
5. Clique **Criar Canal**

### 2.6 Verificação

| Item              | Como verificar                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| Webhook ativo     | Meta mostra status "Ativo" na seção webhooks                                       |
| Mensagem chega    | Envie DM para a página no Facebook, conversa aparece no painel com ícone Messenger |
| Resposta funciona | Responda pelo painel, mensagem chega no Messenger do cliente                       |

---

## 3. Instagram DM

Receba DMs do Instagram profissional da corretora no painel.

### 3.1 Pré-requisitos

- Conta Instagram **Profissional** (Business ou Creator)
- Conta Instagram conectada a uma Página do Facebook
- Mesmo Facebook App criado no passo 2.2 (Messenger)

### 3.2 Adicionar Instagram ao Facebook App

1. No painel do Facebook App → **Adicionar Produto** → **Instagram** → **Configurar**
2. Em **Configurações Básicas**, adicione a plataforma **Instagram**

### 3.3 Conectar conta Instagram

1. Em **Instagram > Configurações** → **Contas do Instagram**
2. Clique **Adicionar Conta**
3. Faça login com a conta Instagram profissional da corretora
4. Autorize as permissões solicitadas

### 3.4 Configurar Webhook (mesmo do Messenger)

Se já configurou o webhook no passo 2.4, ele é compartilhado. Apenas ative os campos do Instagram:

1. Em **Instagram > Webhooks** → **Adicionar URL de Callback** (se não feito)
   - Mesma URL: `https://chat.bensseg.com/chat/webhook/meta`
   - Mesmo token de verificação
2. Ative o campo: `messages`

### 3.5 Criar canal no sistema

1. Acesse **Configurações > Canais**
2. Clique **Novo Canal**
3. Selecione tipo **INSTAGRAM**
4. Preencha:
   - **Nome**: Ex: "Instagram @corretora_bens"
   - **Page ID**: ID da conta Instagram (**NÃO** é o App ID do Facebook)
     - Para encontrar: acesse [Graph API Explorer](https://developers.facebook.com/tools/explorer/), selecione seu App e Page Token, execute: `GET /me?fields=id,username`
     - O `id` retornado (formato `17841xxxxx`) é o valor correto
   - **Access Token**: Page Access Token (**NÃO** é o token do Instagram)
     - Para gerar: Meta for Developers > seu App > **Messenger > Configurações > Tokens de Acesso**
     - Selecione a **Página do Facebook vinculada ao Instagram** e clique **Gerar Token**
5. Clique **Testar Conexão** para validar (deve mostrar o @username)
6. Clique **Criar Canal**

### 3.6 Limitações do Instagram

| Limitação              | Descrição                                                     |
| ---------------------- | ------------------------------------------------------------- |
| **Janela de 24h**      | Só pode responder dentro de 24h da última mensagem do cliente |
| **Tipos de mídia**     | Apenas texto e imagem (sem áudio, vídeo, ou documento)        |
| **Story replies**      | Respostas a stories chegam como mensagem de texto             |
| **Conta profissional** | Conta pessoal não suporta API de mensagens                    |

### 3.7 Verificação

| Item              | Como verificar                                                                         |
| ----------------- | -------------------------------------------------------------------------------------- |
| Webhook ativo     | Meta mostra status "Ativo"                                                             |
| DM chega          | Envie DM para o Instagram da corretora, conversa aparece no painel com ícone Instagram |
| Resposta funciona | Responda pelo painel, mensagem chega no Instagram do cliente                           |

### 3.8 Troubleshooting

| Erro                                       | Causa                                                   | Solução                                                                         |
| ------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `META_APP_SECRET is not configured`        | Variável de ambiente (App Secret) não definida          | Adicione o App Secret do Facebook App no `.env` da VPS e reinicie os containers |
| `HMAC signature verification failed` (401) | App Secret incorreto                                    | Verifique em Meta for Developers > App > Configurações > Básico > Chave Secreta |
| `No active channel found`                  | Page ID no canal não bate com o ID enviado pelo webhook | Corrija o Page ID usando o valor de `GET /me?fields=id,username`                |
| `Invalid OAuth access token`               | Token é do tipo errado (User Token vs Page Token)       | Gere um **Page Access Token** em Messenger > Tokens de Acesso                   |
| `Received malformed Meta webhook payload`  | Imagem Docker desatualizada                             | Faça deploy da imagem mais recente                                              |

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
