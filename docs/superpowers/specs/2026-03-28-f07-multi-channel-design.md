# F07 — Multi-Channel Chat: Web Chat Widget + Messenger + Instagram

> Design spec para expansao do sistema de chat alem do WhatsApp.
> Canais: Web Chat Widget (embedavel), Facebook Messenger, Instagram DM.

---

## 1. Visao Geral

### Objetivo

Permitir que corretoras de seguros atendam clientes por 3 novos canais alem do WhatsApp, todos unificados no mesmo painel do operador.

### Decisoes de Design

| Decisao                | Escolha                          | Motivo                                        |
| ---------------------- | -------------------------------- | --------------------------------------------- |
| Inbox                  | Unificado                        | Lista unica com icone de canal por conversa   |
| Widget estilo          | Flutuante classico               | Padrao universal, publico 30-60+              |
| Visitante widget       | Lead capture pre-chat            | Corretora precisa de telefone para follow-up  |
| AI bot                 | Configuravel por canal           | Modelo existente (`aiAgentId` por channel)    |
| Ordem de implementacao | Web Chat → Messenger → Instagram | Impacto decrescente, complexidade decrescente |

### Canais

| Canal              | Tipo        | Broker                             | Auth visitante            | Estimativa |
| ------------------ | ----------- | ---------------------------------- | ------------------------- | ---------- |
| Web Chat Widget    | `WEB_CHAT`  | `WebChatBroker` (Socket.IO direto) | Anonimo com lead capture  | 2 semanas  |
| Facebook Messenger | `MESSENGER` | `MessengerBroker` (Meta Graph API) | Facebook login implicito  | 1 semana   |
| Instagram DM       | `INSTAGRAM` | `InstagramBroker` (Meta Graph API) | Instagram login implicito | 1 semana   |

---

## 2. Mudancas na Arquitetura

### 2.1 Channel Type — Expansao do Enum

```typescript
// packages/db-chat/src/models/channel.model.ts
// Antes:
type: 'WHATSAPP' | 'WEB'
brokerType: 'BAILEYS' | 'META'

// Depois:
type: 'WHATSAPP' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM'
brokerType: 'BAILEYS' | 'META' | 'WEB_CHAT'
```

Renomear `WEB` para `WEB_CHAT` para clareza (migration no MongoDB).

### 2.2 Channel Config por Tipo

```typescript
// Config armazenada no campo `config` (Mixed) do Channel model

// WHATSAPP (BAILEYS):
{ /* gerenciado internamente pelo broker */ }

// WHATSAPP (META):
{ metaToken: string, metaPhoneNumberId: string }

// WEB_CHAT:
{
  widgetColor: string,       // cor primaria do widget (default: #1f4b5f)
  welcomeMessage: string,    // mensagem de boas-vindas
  offlineMessage: string,    // mensagem fora do horario
  allowedOrigins: string[],  // dominios autorizados para embed
}

// MESSENGER:
{ metaToken: string, metaPageId: string }

// INSTAGRAM:
{ metaToken: string, metaPageId: string }
```

### 2.3 Contact Model — Novos Campos

```typescript
// packages/db-chat/src/models/contact.model.ts
// Campos adicionais:

{
  // Existentes:
  phone?: string,        // WhatsApp
  pushName?: string,     // WhatsApp display name

  // Novos:
  email?: string,        // Web Chat lead capture
  name?: string,         // Web Chat lead capture (pode sobrescrever pushName)
  facebookId?: string,   // Messenger PSID (Page-Scoped ID)
  instagramId?: string,  // Instagram IGSID
  source: 'WHATSAPP' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM',  // canal de origem
}
```

### 2.4 Broker Pattern — Novos Brokers

```
apps/chat-worker/src/messaging/
├── broker.ts                  # Interface base (existente)
├── baileys-broker.ts          # WhatsApp Baileys (existente)
├── meta-broker.ts             # WhatsApp Meta (existente)
├── web-chat-broker.ts         # NOVO: proxy para Socket.IO (sem API externa)
├── messenger-broker.ts        # NOVO: Meta Graph API para Messenger
└── instagram-broker.ts        # NOVO: Meta Graph API para Instagram

// Registro no broker factory:
brokers.set('WHATSAPP_BAILEYS', BaileysBroker)
brokers.set('WHATSAPP_META', MetaWhatsAppBroker)
brokers.set('WEB_CHAT', WebChatBroker)         // NOVO
brokers.set('MESSENGER', MessengerBroker)       // NOVO
brokers.set('INSTAGRAM', InstagramBroker)       // NOVO
```

### 2.5 Webhook — Unificado Meta

O webhook `POST /chat/webhook/meta` ja existe. Messenger e Instagram usam a mesma Meta Graph API com payload similar.

**Diferenciacao por campo:**

```typescript
// WhatsApp:  entry[].changes[].value.messaging_product === 'whatsapp'
// Messenger: entry[].messaging[].sender.id (Page-Scoped)
// Instagram: entry[].messaging[].sender.id (Instagram-Scoped)

// Meta envia campo `object` diferente:
// WhatsApp:  object === 'whatsapp_business_account'
// Messenger: object === 'page'
// Instagram: object === 'instagram'
```

**Rota adicional nao necessaria** — o mesmo endpoint recebe os 3. O processor diferencia pelo `object` field e roteia para o broker correto.

### 2.6 Conversation — Sem Mudanca

O model `Conversation` ja e channel-agnostic (referencia `channelId`). Nao precisa de campo `channelType` — resolve via lookup do Channel.

Para performance no frontend (evitar N+1), o endpoint `GET /chat/conversations` passa a incluir `channelType` no response DTO (join no MongoDB via `populate` ou aggregation).

---

## 3. Web Chat Widget

### 3.1 Arquitetura

```
Site da corretora                    Bens Seguros
┌──────────────┐                    ┌─────────────────┐
│ <script> tag │───carrega widget──>│ chat.bensseg.com │
│              │                    │ /widget/embed.js │
│ ┌──────────┐ │                    │                  │
│ │  iframe   │◄═══Socket.IO═══════►│ /widget namespace│
│ │  widget   │                    │                  │
│ └──────────┘ │                    │ chat-server      │
└──────────────┘                    └─────────────────┘
```

**Embed via `<script>` tag:**

```html
<script
  src="https://chat.bensseg.com/widget/embed.js"
  data-channel-id="ch_abc123"
  defer
></script>
```

O script:

1. Cria um `<iframe>` apontando para `https://chat.bensseg.com/widget/?channelId=ch_abc123`
2. Iframe renderiza o widget React
3. Iframe isola CSS/JS do site hospedeiro (sem conflito)
4. Comunicacao iframe ↔ parent via `postMessage` (para abrir/fechar)

### 3.2 Pre-Chat Form (Lead Capture)

```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │     🏢 Bens Seguros       │  │
│  │     (logo da corretora)   │  │
│  └───────────────────────────┘  │
│                                  │
│  Olá! Para iniciar o            │
│  atendimento, preencha:         │
│                                  │
│  Nome *                          │
│  ┌───────────────────────────┐  │
│  │ Seu nome completo         │  │
│  └───────────────────────────┘  │
│                                  │
│  Telefone *                      │
│  ┌───────────────────────────┐  │
│  │ (11) 99999-9999           │  │
│  └───────────────────────────┘  │
│                                  │
│  E-mail                          │
│  ┌───────────────────────────┐  │
│  │ seu@email.com             │  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │      Iniciar conversa     │  │
│  └───────────────────────────┘  │
│                                  │
│  Seus dados estao protegidos    │
│  conforme LGPD                   │
└─────────────────────────────────┘
```

**Campos:**

- Nome: obrigatorio, min 2 chars
- Telefone: obrigatorio, mascara brasileira, validacao
- E-mail: opcional, validacao formato

**Fluxo:**

1. Visitante preenche form → POST `/widget/conversations` com `{ channelId, name, phone, email? }`
2. Backend cria/busca Contact (match por telefone)
3. Cria Conversation com status `BOT_ACTIVE` (se canal tem AI) ou `WAITING_HUMAN`
4. Retorna `{ conversationId, visitorToken }` (JWT efemero, 24h TTL)
5. Widget conecta Socket.IO com `visitorToken` no namespace `/widget`
6. Mostra `welcomeMessage` do canal como primeira mensagem de sistema

### 3.3 Widget UI — Chat View

```
┌─────────────────────────────────┐
│  🏢 Bens Seguros           ─ ✕ │  ← header: logo + nome + minimizar + fechar
├─────────────────────────────────┤
│                                  │
│  ┌─────────────────────────┐    │
│  │ Olá! Como posso ajudar? │    │  ← welcomeMessage (SYSTEM)
│  └─────────────────────────┘    │
│                                  │
│         ┌───────────────────┐   │
│         │ Quero cotar seguro│   │  ← mensagem do visitante
│         │              10:32│   │
│         └───────────────────┘   │
│                                  │
│  ┌─────────────────────────┐    │
│  │ Claro! Qual tipo de     │    │  ← resposta do bot/agente
│  │ seguro voce precisa?    │    │
│  │ 10:32                   │    │
│  └─────────────────────────┘    │
│                                  │
│  ...                             │
│                                  │
├─────────────────────────────────┤
│  ┌───────────────────────┐ [➤] │  ← input + botao enviar
│  │ Digite sua mensagem... │     │
│  └───────────────────────┘      │
│                                  │
│  ⚡ Powered by Bens Seguros      │  ← branding footer (link para site)
└─────────────────────────────────┘
```

**Dimensoes:**

- Desktop: 380px x 520px, fixo no canto inferior direito (24px margin)
- Mobile: 100vw x 100dvh (fullscreen, sem margin)
- Breakpoint: 480px (abaixo = fullscreen)

**Animacoes:**

- Abrir: slide-up 300ms ease-out + fade-in
- Fechar: slide-down 200ms ease-in + fade-out
- Nova mensagem: fade-in 150ms

**Botao flutuante:**

```
┌──────┐
│  💬  │  ← 56x56px, border-radius 50%, sombra md
│      │     cor primaria do canal (widgetColor)
└──────┘     icone: MessageCircle (lucide)
             badge de unread: bolinha vermelha com numero
```

**Temas:**

- Cor primaria: `widgetColor` do canal config (default `#1f4b5f`)
- Background: branco (claro), slate-900 (escuro) — respeita `prefers-color-scheme`
- Tipografia: system font stack (nao carrega fontes externas, performance)
- Border radius: 12px no container, 16px nas bolhas

### 3.4 Widget — Build e Distribuicao

```
apps/widget/               # NOVO app no monorepo
├── src/
│   ├── components/
│   │   ├── widget-button.tsx      # Botao flutuante
│   │   ├── widget-container.tsx   # Container animado
│   │   ├── pre-chat-form.tsx      # Formulario lead capture
│   │   ├── chat-view.tsx          # Area de mensagens
│   │   ├── message-bubble.tsx     # Bolha simplificada
│   │   └── message-input.tsx      # Input de texto
│   ├── hooks/
│   │   ├── use-widget-socket.ts   # Socket.IO /widget namespace
│   │   └── use-widget-state.ts    # Estado local (open/closed, form/chat)
│   ├── lib/
│   │   ├── widget-api.ts          # HTTP client para /widget/*
│   │   └── constants.ts
│   └── app.tsx                    # Entry point
├── embed.ts                       # Script de embed (cria iframe)
├── vite.config.ts                 # Build com Vite (nao Next.js)
├── package.json
└── tsconfig.json
```

**Por que app separado (nao Next.js)?**

- Widget precisa ser leve (~50KB gzipped)
- Nao precisa de SSR, routing, ou App Router
- Vite produz bundle otimizado para embed
- Isolamento total do app principal

**Build output:**

```
dist/
├── embed.js         # ~5KB — script que injeta iframe
└── widget/
    ├── index.html   # SPA do widget
    ├── widget.js    # ~45KB gzipped — React + Socket.IO client
    └── widget.css   # ~8KB — styles
```

**Servido por:** chat-server como arquivos estaticos (`/widget/*`).

### 3.5 Widget — Backend (chat-server)

**Novas rotas:**

```
# Rotas publicas (sem auth de agente)
POST   /widget/conversations          # Criar conversa (lead capture)
POST   /widget/conversations/:id/messages  # Enviar mensagem
GET    /widget/conversations/:id       # Buscar mensagens (com visitorToken)
GET    /widget/config/:channelId       # Config publica do canal (cor, welcome msg)
```

**Auth do visitante:**

- JWT efemero (`visitorToken`) com payload: `{ conversationId, contactId, channelId, exp: 24h }`
- Gerado ao criar conversa
- Enviado no header `Authorization: Bearer <visitorToken>`
- Middleware separado do auth de agente (`widgetAuthMiddleware`)

**Rate limiting:**

- `/widget/*`: 30 req/min por IP (mais restritivo que API interna)
- Socket.IO `/widget`: 5 msg/seg por visitor (bottleneck)

**CORS:**

- `/widget/*` aceita origens configuradas em `channel.config.allowedOrigins`
- Validacao dinamica por channelId

**Socket.IO namespace `/widget`:**

```typescript
// Namespace separado para visitantes (nao mistura com agentes)
io.of('/widget').use(widgetSocketAuth) // valida visitorToken

// Eventos do visitante:
SEND_MESSAGE: {
  ;(conversationId, text)
}
TYPING_START: {
  conversationId
}

// Eventos para o visitante:
INCOMING_MESSAGE: {
  message
} // resposta do bot/agente
TYPING: {
  name
} // agente digitando
CONVERSATION_UPDATED: {
  status
} // mudou pra HUMAN_ACTIVE, CLOSED, etc.
```

### 3.6 WebChatBroker

```typescript
// apps/chat-worker/src/messaging/web-chat-broker.ts

// WebChatBroker e diferente dos outros brokers:
// - Nao chama API externa
// - Publica no Redis pub/sub (chat-server entrega via Socket.IO /widget)
// - Sempre "connected" (stateless)

class WebChatBroker implements Broker {
  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    // 1. Salva mensagem no MongoDB
    // 2. Publica no Redis CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE
    // 3. Chat-server entrega pro visitante via Socket.IO /widget namespace
    return { externalId: messageId, status: 'SENT' }
  }

  isConnected(): boolean {
    return true // sempre online
  }
}
```

---

## 4. Facebook Messenger

### 4.1 Meta App Setup

A corretora precisa:

1. Criar/usar Facebook App no Meta for Developers
2. Adicionar produto "Messenger" ao app
3. Vincular Facebook Page
4. Gerar Page Access Token (long-lived)
5. Configurar webhook URL: `https://chat.bensseg.com/chat/webhook/meta`
6. Subscrever eventos: `messages`, `messaging_postbacks`

### 4.2 Webhook — Payload Messenger

```typescript
// Meta envia para o mesmo endpoint /chat/webhook/meta
{
  object: 'page',  // ← diferencia de 'whatsapp_business_account' e 'instagram'
  entry: [{
    id: '<PAGE_ID>',
    time: 1234567890,
    messaging: [{
      sender: { id: '<PSID>' },      // Page-Scoped User ID
      recipient: { id: '<PAGE_ID>' },
      timestamp: 1234567890,
      message: {
        mid: '<MESSAGE_ID>',
        text: 'Ola, quero cotar seguro'
      }
    }]
  }]
}
```

**Diferenca do WhatsApp:** Messenger usa `entry[].messaging[]` em vez de `entry[].changes[].value`.

### 4.3 MessengerBroker

```typescript
class MessengerBroker implements Broker {
  private readonly apiUrl = 'https://graph.facebook.com/v21.0'

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    // POST /{PAGE_ID}/messages
    // Body:
    // {
    //   recipient: { id: psid },
    //   message: { text: '...' }
    //   // ou attachment para media
    // }
    // Header: Authorization: Bearer <PAGE_ACCESS_TOKEN>
  }
}
```

**Tipos de mensagem suportados:**

- TEXT: `{ message: { text } }`
- IMAGE: `{ message: { attachment: { type: 'image', payload: { url } } } }`
- AUDIO: `{ message: { attachment: { type: 'audio', payload: { url } } } }`
- VIDEO: `{ message: { attachment: { type: 'video', payload: { url } } } }`
- DOCUMENT: `{ message: { attachment: { type: 'file', payload: { url } } } }`

### 4.4 Contact Resolution

```typescript
// Messenger identifica usuarios por PSID (Page-Scoped ID)
// Para obter nome/foto: GET /{PSID}?fields=first_name,last_name,profile_pic

// Fluxo:
// 1. Incoming message com sender.id = PSID
// 2. Busca Contact por facebookId === PSID && tenantId
// 3. Se nao existe: cria Contact com facebookId, busca nome via Graph API
// 4. Se existe: usa Contact existente
```

---

## 5. Instagram DM

### 5.1 Meta App Setup

Usa o **mesmo Meta App** do Messenger (economiza configuracao):

1. Adicionar produto "Instagram" ao app existente
2. Vincular Instagram Professional Account (Business ou Creator)
3. Subscrever eventos: `messages` (Instagram messaging)
4. Mesmo webhook URL: `https://chat.bensseg.com/chat/webhook/meta`

### 5.2 Webhook — Payload Instagram

```typescript
{
  object: 'instagram',  // ← diferencia de 'page' e 'whatsapp_business_account'
  entry: [{
    id: '<IG_USER_ID>',
    time: 1234567890,
    messaging: [{
      sender: { id: '<IGSID>' },        // Instagram-Scoped User ID
      recipient: { id: '<IG_USER_ID>' },
      timestamp: 1234567890,
      message: {
        mid: '<MESSAGE_ID>',
        text: 'Vi o post sobre seguro auto'
      }
    }]
  }]
}
```

**Payload identico ao Messenger** (mesma estrutura `messaging[]`), diferenciado pelo `object: 'instagram'`.

### 5.3 InstagramBroker

```typescript
class InstagramBroker implements Broker {
  private readonly apiUrl = 'https://graph.facebook.com/v21.0'

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    // POST /{IG_USER_ID}/messages
    // Body identico ao Messenger:
    // { recipient: { id: igsid }, message: { text } }
    // Diferenca: limitacoes de media (Instagram nao aceita todos os tipos)
  }
}
```

**Limitacoes Instagram:**

- Janela de 24h para responder (Human Agent Tag nao disponivel como no Messenger)
- Nao suporta audio/video attachment direto (so imagem e texto)
- Story replies vem como `message.reply_to.story` — tratar como texto com contexto

### 5.4 Contact Resolution

```typescript
// Instagram identifica usuarios por IGSID (Instagram-Scoped User ID)
// Para obter username: GET /{IGSID}?fields=name,username

// Fluxo:
// 1. Incoming message com sender.id = IGSID
// 2. Busca Contact por instagramId === IGSID && tenantId
// 3. Se nao existe: cria Contact com instagramId, busca username via Graph API
// 4. Se existe: usa Contact existente
```

---

## 6. Frontend — Painel do Operador

### 6.1 Conversation List — Icone de Canal

No `ConversationListItem`, adicionar icone do canal antes do nome do contato:

```
┌─────────────────────────────────────────┐
│ 📱 João Silva              HUMAN_ACTIVE │  ← icone WhatsApp verde
│ Quero renovar meu seguro...     10:32   │
├─────────────────────────────────────────┤
│ 🌐 Maria Santos            WAITING      │  ← icone globo azul (Web Chat)
│ Boa tarde, preciso de cotacao    10:28   │
├─────────────────────────────────────────┤
│ Ⓜ️ Pedro Costa             BOT_ACTIVE   │  ← icone Messenger azul
│ Quanto custa seguro auto?        10:25   │
├─────────────────────────────────────────┤
│ 📷 Ana Oliveira             WAITING      │  ← icone Instagram roxo
│ Vi o post sobre seguro vida      10:20   │
└─────────────────────────────────────────┘
```

**Icones por canal (lucide-react + custom SVGs):**

| Canal     | Icone                             | Cor                    |
| --------- | --------------------------------- | ---------------------- |
| WhatsApp  | `MessageCircle` (ou SVG WhatsApp) | `#25D366`              |
| Web Chat  | `Globe`                           | `#1f4b5f` (teal brand) |
| Messenger | SVG Messenger logo                | `#0084FF`              |
| Instagram | SVG Instagram logo                | `#E4405F`              |

**Filtro por canal:** Adicionar chip de filtro na toolbar da conversation list:

```
[Todos] [Em espera] [Meus] [Fechados]     ← filtros existentes (status)
[Canais ▾]                                  ← NOVO dropdown multi-select
  ☑ WhatsApp
  ☑ Web Chat
  ☑ Messenger
  ☑ Instagram
```

### 6.2 Contact Profile — Informacoes por Canal

O painel lateral de perfil do contato mostra informacoes diferentes conforme o canal:

```
┌──────────────────────────────────┐
│         [Avatar]                  │
│       Maria Santos                │
│                                   │
│  ── Contato ─────────────────── │
│  📱 (11) 99999-9999   ← phone   │
│  ✉️  maria@email.com   ← email   │
│  🌐 Web Chat           ← canal   │
│                                   │
│  ── Canal de Origem ──────────  │
│  Primeiro contato via Web Chat   │
│  em 28/03/2026 as 10:28         │
│                                   │
│  ── Cliente Vinculado ─────── │
│  [Ver ficha no ERP →]           │
│  (se match por telefone)         │
└──────────────────────────────────┘
```

**Vinculacao automatica:**

- Quando Web Chat visitor informa telefone, buscar `Client` no PostgreSQL por telefone
- Se encontrar: mostrar link "Ver ficha no ERP" no perfil do contato
- Messenger/Instagram: sem telefone direto, vinculacao manual ou por nome

### 6.3 Channel Management — Settings

Expandir `Settings > Canais` para suportar os 4 tipos:

```
Settings > Canais

┌─────────────────────────────────────────────────────────┐
│  Canais de Atendimento                         [+ Novo] │
│  Gerencie seus canais de comunicacao                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📱 WhatsApp Principal      CONECTADO    [Editar]   │  │
│  │    +55 11 99999-9999       Baileys                 │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🌐 Chat do Site            ATIVO        [Editar]   │  │
│  │    3 origens permitidas    Bot IA ativo            │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Ⓜ️ Messenger               CONECTADO    [Editar]   │  │
│  │    Pagina: Corretora Bens  Bot IA ativo            │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📷 Instagram DM            CONECTADO    [Editar]   │  │
│  │    @corretora_bens         Bot IA inativo          │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Form de canal por tipo:**

| Tipo               | Campos especificos                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| WhatsApp (Baileys) | Nome, QR Code / Pairing Code                                                                                             |
| WhatsApp (Meta)    | Nome, Phone Number ID, Access Token                                                                                      |
| Web Chat           | Nome, Cor do widget, Mensagem de boas-vindas, Mensagem offline, Origens permitidas, Codigo de embed (readonly, copiavel) |
| Messenger          | Nome, Page ID, Page Access Token, Instrucoes de webhook                                                                  |
| Instagram          | Nome, Page ID, Page Access Token, Instrucoes de webhook                                                                  |

**Codigo de embed (Web Chat):**
Ao criar canal Web Chat, mostrar snippet copiavel:

```html
<script
  src="https://chat.bensseg.com/widget/embed.js"
  data-channel-id="ch_abc123"
  defer
></script>
```

---

## 7. Fluxo de Dados — Incoming Message

### 7.1 Web Chat

```
Visitante digita msg no widget
  → Socket.IO /widget SEND_MESSAGE { conversationId, text }
  → chat-server valida visitorToken
  → Cria Message (senderType: CLIENT) no MongoDB
  → Publica Redis INCOMING_MESSAGE
  → chat-server entrega via Socket.IO / (agentes) como INCOMING_MESSAGE
  → Se BOT_ACTIVE: enfileira AI_BOT queue
  → Resposta do bot/agente salva como Message
  → Publica Redis INCOMING_MESSAGE
  → chat-server entrega via Socket.IO /widget (visitante)
```

### 7.2 Messenger / Instagram

```
Usuario envia DM no Messenger/Instagram
  → Meta envia webhook POST /chat/webhook/meta
  → chat-server valida HMAC signature
  → Identifica canal por object ('page' | 'instagram') + entry[].id (PAGE_ID)
  → Enfileira PROCESS_INCOMING { source: 'MESSENGER' | 'INSTAGRAM', ... }
  → Worker processor:
    → Busca/cria Contact por facebookId/instagramId
    → Busca/cria Conversation por channelId + contactId
    → Cria Message
    → Publica Redis INCOMING_MESSAGE
  → chat-server entrega via Socket.IO (agentes)
  → Se BOT_ACTIVE: enfileira AI_BOT
```

### 7.3 Outgoing Message (Agente responde)

```
Agente envia msg no painel (qualquer canal)
  → POST /chat/conversations/:id/messages { text }
  → Cria Message (senderType: AGENT)
  → Enfileira SEND_MESSAGE
  → Worker busca Channel, resolve broker:
    → WEB_CHAT: publica Redis → Socket.IO /widget
    → MESSENGER: POST Meta Graph API /{PAGE_ID}/messages
    → INSTAGRAM: POST Meta Graph API /{IG_USER_ID}/messages
    → WHATSAPP: Baileys ou Meta API (existente)
  → Atualiza status da mensagem (SENT/FAILED)
```

---

## 8. Seguranca

### Widget

- **CORS dinamico:** `/widget/*` aceita apenas origens em `channel.config.allowedOrigins`
- **Rate limit:** 30 req/min por IP nas rotas `/widget/*`
- **Socket.IO rate limit:** 5 msg/seg por visitor
- **visitorToken:** JWT com 24h TTL, scoped para conversationId (nao pode acessar outras conversas)
- **Iframe sandbox:** `sandbox="allow-scripts allow-same-origin allow-forms"` (sem popups, sem top navigation)
- **CSP:** `frame-ancestors` configurado para origens permitidas
- **Validacao de input:** Zod nos campos do pre-chat form (telefone brasileiro, email format)
- **PII:** Telefone do visitante protegido pelo mesmo Presenter Pattern dos Clients

### Meta Channels

- **HMAC validation:** Ja implementada no webhook handler
- **Token storage:** Page Access Tokens em `channel.config` (MongoDB field-level encryption)
- **Webhook verify token:** Validado no GET de verificacao

---

## 9. Limites e Constraints

| Constraint                  | Valor          | Motivo                                     |
| --------------------------- | -------------- | ------------------------------------------ |
| Max canais por org          | 20 (total)     | Evitar abuso                               |
| Max Web Chat canais por org | 5              | Cada um e um site diferente                |
| Max origens por Web Chat    | 10             | Dominios autorizados                       |
| Widget bundle size          | < 60KB gzipped | Performance do site hospedeiro             |
| Socket /widget connections  | 500 por canal  | Capacidade do servidor                     |
| visitorToken TTL            | 24h            | Conversa expira mesmo tempo que auto-close |
| Pre-chat form timeout       | nenhum         | Visitor pode preencher quando quiser       |
| Messenger 24h window        | Sim            | Limitacao da Meta API                      |
| Instagram 24h window        | Sim            | Limitacao da Meta API                      |

---

## 10. Implementacao — Fases

### Fase 1: Foundation (2 dias)

1. Expandir enum Channel.type: `WEB_CHAT`, `MESSENGER`, `INSTAGRAM`
2. Expandir enum Channel.brokerType: `WEB_CHAT`
3. Adicionar campos ao Contact model: `email`, `name`, `facebookId`, `instagramId`, `source`
4. Criar migration MongoDB (rename `WEB` → `WEB_CHAT` se houver dados)
5. Atualizar broker factory com registro dos novos tipos
6. Adicionar `channelType` ao DTO de response da conversation list API

### Fase 2: Web Chat Widget — Backend (3 dias)

1. Rotas `/widget/*` (create conversation, send message, get messages, get config)
2. `widgetAuthMiddleware` (valida visitorToken JWT)
3. Socket.IO namespace `/widget` com auth e rate limiting
4. `WebChatBroker` (publica no Redis, entrega via Socket.IO /widget)
5. CORS dinamico por channelId
6. Testes unitarios para rotas e broker

### Fase 3: Web Chat Widget — Frontend (5 dias)

1. App `apps/widget/` com Vite + React + Socket.IO client
2. `embed.ts` — script de embed que cria iframe
3. `pre-chat-form.tsx` — formulario com validacao (nome, telefone, email)
4. `chat-view.tsx` — area de mensagens com auto-scroll
5. `message-bubble.tsx` — bolha simplificada (texto + timestamp)
6. `message-input.tsx` — input com botao enviar
7. `widget-button.tsx` — botao flutuante com badge unread
8. `widget-container.tsx` — container animado (open/close)
9. Hooks: `use-widget-socket.ts`, `use-widget-state.ts`
10. Build config Vite (output < 60KB gzip)
11. chat-server servir assets estaticos `/widget/*`
12. Temas claro/escuro (respeita prefers-color-scheme)

### Fase 4: Operador — Inbox Unificado (2 dias)

1. Icone de canal no `ConversationListItem`
2. Filtro por canal (chip dropdown na toolbar)
3. Contact profile com info de canal
4. Channel management em Settings (CRUD dos 4 tipos)
5. Snippet de embed copiavel para Web Chat

### Fase 5: Messenger (3 dias)

1. `MessengerBroker` (Meta Graph API, send message)
2. Webhook handler: parse `object === 'page'` + `entry[].messaging[]`
3. Contact resolution por `facebookId` (PSID) + fetch nome via Graph API
4. Formulario de canal Messenger em Settings (Page ID, Token)
5. Testes unitarios

### Fase 6: Instagram (2 dias)

1. `InstagramBroker` (Meta Graph API, send message)
2. Webhook handler: parse `object === 'instagram'` + `entry[].messaging[]`
3. Contact resolution por `instagramId` (IGSID) + fetch username
4. Limitacoes: sem audio/video, janela 24h
5. Formulario de canal Instagram em Settings
6. Testes unitarios

### Total estimado: ~17 dias uteis (~3.5 semanas)
