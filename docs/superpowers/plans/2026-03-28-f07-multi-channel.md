# F07 Multi-Channel Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Web Chat Widget, Facebook Messenger, and Instagram DM channels to the existing WhatsApp-only chat system, with a unified operator inbox.

**Architecture:** Extend the existing broker pattern with 3 new broker implementations. Web Chat uses a standalone Vite app (iframe embed) communicating via Socket.IO `/widget` namespace. Messenger and Instagram share the existing Meta webhook endpoint, differentiated by `object` field. All channels converge into the same Conversation/Message MongoDB models and Socket.IO delivery to operators.

**Tech Stack:** Vite 6 + React 19 (widget), Fastify 5 + Socket.IO 4 (backend), MongoDB/Mongoose (models), Meta Graph API v21.0 (Messenger/Instagram), BullMQ 5 (job processing)

**Spec:** `docs/superpowers/specs/2026-03-28-f07-multi-channel-design.md`

---

## File Structure

### New Files

```
packages/db-chat/src/models/
  channel.model.ts                    # MODIFY — expand type/brokerType enums
  contact.model.ts                    # MODIFY — add email, name, facebookId, instagramId, source

packages/shared/src/
  chat-constants.ts                   # MODIFY — add CHAT_LIMITS.MAX_WEB_CHAT_CHANNELS_PER_ORG, MAX_CHANNELS_PER_ORG
  socket-events.ts                    # MODIFY — add WIDGET_ prefixed events
  channel-types.ts                    # CREATE — shared ChannelType, BrokerType, channel icon/color map

apps/chat-server/src/infra/http/routes/
  widget-routes.ts                    # CREATE — /widget/* public API (create conv, send msg, get config)
  webhook-routes.ts                   # MODIFY — handle object='page' and object='instagram'
  channel-routes.ts                   # MODIFY — accept new channel types in create/update

apps/chat-server/src/infra/http/middleware/
  widget-auth.ts                      # CREATE — visitorToken JWT middleware

apps/chat-server/src/infra/socket/
  widget-namespace.ts                 # CREATE — Socket.IO /widget namespace setup
  socket-handler.ts                   # MODIFY — integrate widget pub/sub delivery

apps/chat-worker/src/messaging/
  web-chat-broker.ts                  # CREATE — stateless broker, publishes to Redis
  messenger-broker.ts                 # CREATE — Meta Graph API for Messenger
  instagram-broker.ts                 # CREATE — Meta Graph API for Instagram
  send-message-processor.ts           # MODIFY — selectBroker handles new types

apps/chat-worker/src/processors/
  incoming-message-processor.ts       # MODIFY — handle MESSENGER/INSTAGRAM source, contact resolution

apps/widget/                          # CREATE — entire new Vite app
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    app.tsx
    embed.ts
    components/
      widget-button.tsx
      widget-container.tsx
      pre-chat-form.tsx
      chat-view.tsx
      message-bubble.tsx
      message-input.tsx
    hooks/
      use-widget-socket.ts
      use-widget-state.ts
    lib/
      widget-api.ts
      constants.ts

apps/web/src/features/chat/
  types/index.ts                      # MODIFY — add channelType to ConversationData, expand ChannelData
  components/
    conversation-list-item.tsx        # MODIFY — add channel icon
    conversation-list.tsx             # MODIFY — add channel filter
    contact-profile.tsx               # MODIFY — show channel-specific info
    channel-icon.tsx                  # CREATE — channel icon/color component

apps/web/src/features/channels/
  components/
    channel-form-sheet.tsx            # MODIFY — forms for WEB_CHAT, MESSENGER, INSTAGRAM
    channels-table.tsx                # MODIFY — show new channel types
    embed-code-dialog.tsx             # CREATE — copyable embed snippet
```

---

## Phase 1: Foundation

### Task 1: Expand Channel and Contact Models

**Files:**

- Modify: `packages/db-chat/src/models/channel.model.ts`
- Modify: `packages/db-chat/src/models/contact.model.ts`
- Create: `packages/shared/src/channel-types.ts`
- Modify: `packages/shared/src/chat-constants.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create shared channel types**

Create `packages/shared/src/channel-types.ts`:

```typescript
export const CHANNEL_TYPES = [
  'WHATSAPP',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]

export const BROKER_TYPES = ['BAILEYS', 'META', 'WEB_CHAT'] as const
export type BrokerType = (typeof BROKER_TYPES)[number]

export const CONTACT_SOURCES = [
  'WHATSAPP',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
] as const
export type ContactSource = (typeof CONTACT_SOURCES)[number]

export const CHANNEL_META: Record<
  ChannelType,
  { label: string; color: string }
> = {
  WHATSAPP: { label: 'WhatsApp', color: '#25D366' },
  WEB_CHAT: { label: 'Web Chat', color: '#1f4b5f' },
  MESSENGER: { label: 'Messenger', color: '#0084FF' },
  INSTAGRAM: { label: 'Instagram', color: '#E4405F' },
}
```

- [ ] **Step 2: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export * from './channel-types'
```

- [ ] **Step 3: Update Channel model enums**

In `packages/db-chat/src/models/channel.model.ts`, change:

```typescript
// type enum: add WEB_CHAT, MESSENGER, INSTAGRAM
type: { type: String, enum: ['WHATSAPP', 'WEB_CHAT', 'MESSENGER', 'INSTAGRAM'], required: true },

// brokerType enum: add WEB_CHAT
brokerType: { type: String, enum: ['BAILEYS', 'META', 'WEB_CHAT'], default: 'BAILEYS' },
```

- [ ] **Step 4: Update Contact model — add new fields**

In `packages/db-chat/src/models/contact.model.ts`, add fields:

```typescript
const contactSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    whatsappPhone: { type: String }, // CHANGE: remove required (Web Chat/Messenger/Instagram may not have phone)
    pushName: String,
    profilePicUrl: String,
    clientId: String,
    // NEW fields:
    name: String,
    email: String,
    facebookId: String,
    instagramId: String,
    source: {
      type: String,
      enum: ['WHATSAPP', 'WEB_CHAT', 'MESSENGER', 'INSTAGRAM'],
      default: 'WHATSAPP',
    },
  },
  { timestamps: true }
)
```

Update the unique index — the current index is `{ tenantId: 1, whatsappPhone: 1 }` (unique). Since `whatsappPhone` is no longer required, we need a sparse index and additional indexes for other identifiers:

```typescript
// Replace existing unique index:
contactSchema.index(
  { tenantId: 1, whatsappPhone: 1 },
  { unique: true, sparse: true }
)
contactSchema.index(
  { tenantId: 1, facebookId: 1 },
  { unique: true, sparse: true }
)
contactSchema.index(
  { tenantId: 1, instagramId: 1 },
  { unique: true, sparse: true }
)
```

- [ ] **Step 5: Add limits to chat-constants**

In `packages/shared/src/chat-constants.ts`, add to `CHAT_LIMITS`:

```typescript
MAX_CHANNELS_PER_ORG: 20,
MAX_WEB_CHAT_CHANNELS_PER_ORG: 5,
MAX_WIDGET_ORIGINS_PER_CHANNEL: 10,
MAX_WIDGET_CONNECTIONS_PER_CHANNEL: 500,
WIDGET_RATE_LIMIT_PER_MIN: 30,
WIDGET_SOCKET_RATE_LIMIT_PER_SEC: 5,
VISITOR_TOKEN_TTL_HOURS: 24,
```

- [ ] **Step 6: Build and verify**

Run: `pnpm turbo build --filter=@repo/db-chat --filter=@repo/shared`

Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add packages/db-chat/src/models/channel.model.ts packages/db-chat/src/models/contact.model.ts packages/shared/src/channel-types.ts packages/shared/src/chat-constants.ts packages/shared/src/index.ts
git commit -m "feat(f07): expand channel/contact models for multi-channel support"
```

---

### Task 2: Update Conversation List API to Include channelType

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/conversation-routes.ts`
- Modify: `apps/web/src/features/chat/types/index.ts`

- [ ] **Step 1: Add channelType to conversation list response**

In the `ListConversations` use case or in `conversation-routes.ts` where conversations are returned, add a lookup to include `channelType`. The most efficient way is a MongoDB aggregation with `$lookup`:

In the list conversations handler, after fetching conversations, do a batch lookup:

```typescript
// After fetching conversations from DB:
const channelIds = [...new Set(conversations.map((c) => c.channelId))]
const channels = await Channel.find(
  { _id: { $in: channelIds } },
  { _id: 1, type: 1 }
)
const channelTypeMap = new Map(
  channels.map((ch) => [ch._id.toString(), ch.type])
)

const enriched = conversations.map((conv) => ({
  ...conv.toObject(),
  channelType: channelTypeMap.get(conv.channelId) ?? 'WHATSAPP',
}))
```

- [ ] **Step 2: Update frontend types**

In `apps/web/src/features/chat/types/index.ts`:

```typescript
// Add to ChannelType imports:
export type ChannelType = 'WHATSAPP' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM'

// Add to ConversationData:
export interface ConversationData {
  // ... existing fields ...
  channelType?: ChannelType // NEW — populated by list API
}

// Update ChannelData:
export interface ChannelData {
  id: string
  name: string
  type: ChannelType // CHANGED from 'WHATSAPP' | 'WEB'
  brokerType: 'BAILEYS' | 'META' | 'WEB_CHAT' // CHANGED
  phoneNumber: string | null
  isActive: boolean
  status: ChannelStatus
  aiAgentId: string | null
}

// Update ContactData:
export interface ContactData {
  id: string
  tenantId: string
  whatsappPhone: string | null // CHANGED — now nullable
  pushName: string | null
  profilePicUrl: string | null
  clientId: string | null
  name: string | null // NEW
  email: string | null // NEW
  facebookId: string | null // NEW
  instagramId: string | null // NEW
  source: ChannelType | null // NEW
}
```

- [ ] **Step 3: Build and verify**

Run: `pnpm turbo build --filter=chat-server --filter=web`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/conversation-routes.ts apps/web/src/features/chat/types/index.ts
git commit -m "feat(f07): add channelType to conversation list API and frontend types"
```

---

### Task 3: Update Broker Factory for New Channel Types

**Files:**

- Modify: `apps/chat-worker/src/processors/send-message-processor.ts`

- [ ] **Step 1: Extend selectBroker to handle new types**

In `send-message-processor.ts`, update the `selectBroker` function:

```typescript
import { WebChatBroker } from '../messaging/web-chat-broker'
import { MessengerBroker } from '../messaging/messenger-broker'
import { InstagramBroker } from '../messaging/instagram-broker'

function selectBroker(
  brokerType: string,
  channelId: string,
  channelConfig: unknown
): Broker {
  if (brokerType === 'BAILEYS') {
    const broker = manager.getChannel(channelId)
    if (!broker) {
      throw new UnrecoverableError(`Baileys channel ${channelId} not connected`)
    }
    return broker
  }

  const config = toConfigRecord(channelConfig)

  switch (brokerType) {
    case 'META':
      return new MetaBroker(config)
    case 'WEB_CHAT':
      return new WebChatBroker(config)
    case 'MESSENGER':
      return new MessengerBroker(config)
    case 'INSTAGRAM':
      return new InstagramBroker(config)
    default:
      throw new UnrecoverableError(`Unknown broker type: ${brokerType}`)
  }
}
```

Note: The actual broker classes will be created in later tasks. For now, create placeholder files so the import doesn't break the build.

- [ ] **Step 2: Create placeholder brokers**

Create `apps/chat-worker/src/messaging/web-chat-broker.ts`:

```typescript
import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker'

export class WebChatBroker implements Broker {
  async connect(_events: BrokerEvents): Promise<void> {
    // WebChat is stateless — no connection needed
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async sendMessage(_payload: MessagePayload): Promise<MessageResult> {
    throw new Error('WebChatBroker.sendMessage not yet implemented')
  }

  isConnected(): boolean {
    return true
  }
}
```

Create `apps/chat-worker/src/messaging/messenger-broker.ts`:

```typescript
import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker'

export class MessengerBroker implements Broker {
  async connect(_events: BrokerEvents): Promise<void> {
    // Messenger is stateless
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async sendMessage(_payload: MessagePayload): Promise<MessageResult> {
    throw new Error('MessengerBroker.sendMessage not yet implemented')
  }

  isConnected(): boolean {
    return true
  }
}
```

Create `apps/chat-worker/src/messaging/instagram-broker.ts`:

```typescript
import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker'

export class InstagramBroker implements Broker {
  async connect(_events: BrokerEvents): Promise<void> {
    // Instagram is stateless
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async sendMessage(_payload: MessagePayload): Promise<MessageResult> {
    throw new Error('InstagramBroker.sendMessage not yet implemented')
  }

  isConnected(): boolean {
    return true
  }
}
```

- [ ] **Step 3: Build and verify**

Run: `pnpm turbo build --filter=chat-worker`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/chat-worker/src/processors/send-message-processor.ts apps/chat-worker/src/messaging/web-chat-broker.ts apps/chat-worker/src/messaging/messenger-broker.ts apps/chat-worker/src/messaging/instagram-broker.ts
git commit -m "feat(f07): extend broker factory and create placeholder brokers"
```

---

## Phase 2: Web Chat Widget — Backend

### Task 4: Visitor Token Auth Middleware

**Files:**

- Create: `apps/chat-server/src/infra/http/middleware/widget-auth.ts`
- Modify: `packages/shared/src/chat-constants.ts` (if not already added)

- [ ] **Step 1: Create widget auth middleware**

Create `apps/chat-server/src/infra/http/middleware/widget-auth.ts`:

```typescript
import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { env } from '@repo/env'

export interface VisitorTokenPayload {
  conversationId: string
  contactId: string
  channelId: string
  tenantId: string
}

export function signVisitorToken(payload: VisitorTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' })
}

export async function widgetAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply
      .status(401)
      .send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token ausente' },
      })
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as VisitorTokenPayload
    request.visitorData = payload
  } catch {
    return reply
      .status(401)
      .send({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expirado ou inválido' },
      })
  }
}
```

- [ ] **Step 2: Add type declaration for visitorData on request**

Add to the Fastify request type declaration (in the chat-server's types or a `fastify.d.ts`):

```typescript
import type { VisitorTokenPayload } from './infra/http/middleware/widget-auth'

declare module 'fastify' {
  interface FastifyRequest {
    visitorData?: VisitorTokenPayload
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/infra/http/middleware/widget-auth.ts
git commit -m "feat(f07): add visitor token JWT middleware for widget auth"
```

---

### Task 5: Widget REST Routes

**Files:**

- Create: `apps/chat-server/src/infra/http/routes/widget-routes.ts`
- Modify: `apps/chat-server/src/app.ts` (register routes)

- [ ] **Step 1: Create widget routes**

Create `apps/chat-server/src/infra/http/routes/widget-routes.ts`:

```typescript
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Channel } from '@repo/db-chat/models/channel.model'
import { Contact } from '@repo/db-chat/models/contact.model'
import { Conversation } from '@repo/db-chat/models/conversation.model'
import { Message } from '@repo/db-chat/models/message.model'
import { CHAT_LIMITS, CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import {
  signVisitorToken,
  widgetAuthMiddleware,
} from '../middleware/widget-auth'

const createConversationSchema = z.object({
  channelId: z.string().min(1),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{10,14}$/, 'Telefone inválido'),
  email: z.string().email().optional(),
})

const sendMessageSchema = z.object({
  text: z.string().min(1).max(4096),
})

export async function widgetRoutes(app: FastifyInstance): Promise<void> {
  // Public: no agent auth required

  // GET /widget/config/:channelId — public channel config
  app.get('/widget/config/:channelId', async (request, reply) => {
    const { channelId } = request.params as { channelId: string }
    const channel = await Channel.findOne({
      _id: channelId,
      isActive: true,
      type: 'WEB_CHAT',
    })

    if (!channel) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
        })
    }

    const config = channel.config as Record<string, unknown>
    return reply.send({
      success: true,
      data: {
        channelId: channel._id.toString(),
        name: channel.name,
        widgetColor: config.widgetColor ?? '#1f4b5f',
        welcomeMessage: config.welcomeMessage ?? 'Olá! Como podemos ajudar?',
      },
    })
  })

  // POST /widget/conversations — create conversation (lead capture)
  app.post('/widget/conversations', async (request, reply) => {
    const body = createConversationSchema.parse(request.body)
    const channel = await Channel.findOne({
      _id: body.channelId,
      isActive: true,
      type: 'WEB_CHAT',
    })

    if (!channel) {
      return reply
        .status(404)
        .send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Canal não encontrado' },
        })
    }

    // Validate origin
    const origin = request.headers.origin
    const allowedOrigins = (channel.config as Record<string, unknown>)
      .allowedOrigins as string[] | undefined
    if (allowedOrigins?.length && origin && !allowedOrigins.includes(origin)) {
      return reply
        .status(403)
        .send({
          success: false,
          error: {
            code: 'ORIGIN_NOT_ALLOWED',
            message: 'Origem não autorizada',
          },
        })
    }

    const tenantId = channel.tenantId

    // Upsert contact by phone
    const contact = await Contact.findOneAndUpdate(
      { tenantId, whatsappPhone: body.phone },
      {
        $set: { name: body.name, email: body.email, source: 'WEB_CHAT' },
        $setOnInsert: { tenantId, whatsappPhone: body.phone },
      },
      { upsert: true, new: true }
    )

    // Find open conversation or create new
    const existingConversation = await Conversation.findOne({
      tenantId,
      channelId: channel._id.toString(),
      contactId: contact._id.toString(),
      status: { $ne: 'CLOSED' },
    })

    if (existingConversation) {
      const visitorToken = signVisitorToken({
        conversationId: existingConversation._id.toString(),
        contactId: contact._id.toString(),
        channelId: channel._id.toString(),
        tenantId,
      })
      return reply.send({
        success: true,
        data: {
          conversationId: existingConversation._id.toString(),
          visitorToken,
        },
      })
    }

    const initialStatus = channel.aiAgentId ? 'BOT_ACTIVE' : 'WAITING_HUMAN'

    const conversation = await Conversation.create({
      tenantId,
      channelId: channel._id.toString(),
      contactId: contact._id.toString(),
      status: initialStatus,
      whatsappPhone: body.phone,
    })

    // Create welcome message
    const config = channel.config as Record<string, unknown>
    const welcomeMessage =
      (config.welcomeMessage as string) ?? 'Olá! Como podemos ajudar?'

    await Message.create({
      conversationId: conversation._id.toString(),
      tenantId,
      senderType: 'SYSTEM',
      text: welcomeMessage,
      type: 'TEXT',
      status: 'SENT',
    })

    // Publish conversation update for operators
    const redis = app.redis
    await redis.publish(
      CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
      JSON.stringify({ tenantId, conversationId: conversation._id.toString() })
    )

    const visitorToken = signVisitorToken({
      conversationId: conversation._id.toString(),
      contactId: contact._id.toString(),
      channelId: channel._id.toString(),
      tenantId,
    })

    return reply.status(201).send({
      success: true,
      data: { conversationId: conversation._id.toString(), visitorToken },
    })
  })

  // Protected routes (visitorToken required)
  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', widgetAuthMiddleware)

    // POST /widget/conversations/:id/messages — send message
    protectedApp.post(
      '/widget/conversations/:id/messages',
      async (request, reply) => {
        const { id } = request.params as { id: string }
        const visitor = request.visitorData!
        if (visitor.conversationId !== id) {
          return reply
            .status(403)
            .send({
              success: false,
              error: { code: 'FORBIDDEN', message: 'Acesso negado' },
            })
        }

        const body = sendMessageSchema.parse(request.body)

        const conversation = await Conversation.findOne({
          _id: id,
          tenantId: visitor.tenantId,
        })
        if (!conversation || conversation.status === 'CLOSED') {
          return reply
            .status(404)
            .send({
              success: false,
              error: {
                code: 'CONVERSATION_CLOSED',
                message: 'Conversa encerrada',
              },
            })
        }

        const message = await Message.create({
          conversationId: id,
          tenantId: visitor.tenantId,
          senderType: 'CLIENT',
          senderName: null,
          text: body.text,
          type: 'TEXT',
          status: 'SENT',
        })

        await Conversation.updateOne(
          { _id: id },
          { $set: { lastMessageText: body.text, lastMessageAt: new Date() } }
        )

        const redis = app.redis
        await redis.publish(
          CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
          JSON.stringify({
            tenantId: visitor.tenantId,
            conversationId: id,
            message: message.toObject(),
          })
        )
        await redis.publish(
          CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
          JSON.stringify({ tenantId: visitor.tenantId, conversationId: id })
        )

        // If BOT_ACTIVE, enqueue AI bot
        if (conversation.status === 'BOT_ACTIVE') {
          const { aiBotQueue } = app.queues
          await aiBotQueue.add(
            'ai-bot',
            {
              tenantId: visitor.tenantId,
              conversationId: id,
              messageId: message._id.toString(),
            },
            { jobId: `ai-bot-${id}`, removeOnComplete: true, removeOnFail: 100 }
          )
        }

        return reply
          .status(201)
          .send({ success: true, data: { id: message._id.toString() } })
      }
    )

    // GET /widget/conversations/:id — get messages
    protectedApp.get('/widget/conversations/:id', async (request, reply) => {
      const { id } = request.params as { id: string }
      const visitor = request.visitorData!
      if (visitor.conversationId !== id) {
        return reply
          .status(403)
          .send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acesso negado' },
          })
      }

      const { before } = request.query as { before?: string }

      const query: Record<string, unknown> = {
        conversationId: id,
        tenantId: visitor.tenantId,
      }
      if (before) {
        const beforeMsg = await Message.findById(before)
        if (beforeMsg) {
          query.createdAt = { $lt: beforeMsg.createdAt }
        }
      }

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(CHAT_LIMITS.MESSAGES_PER_PAGE)
        .lean()

      return reply.send({
        success: true,
        data: messages.reverse(),
        meta: { hasMore: messages.length === CHAT_LIMITS.MESSAGES_PER_PAGE },
      })
    })
  })
}
```

- [ ] **Step 2: Register widget routes in app**

In `apps/chat-server/src/app.ts`, register the widget routes:

```typescript
import { widgetRoutes } from './infra/http/routes/widget-routes'

// After other route registrations:
app.register(widgetRoutes, { prefix: '/widget' })
```

Also add CORS for widget routes — the widget routes need dynamic CORS based on channel config. Add a CORS hook or use `@fastify/cors` with a custom origin function.

- [ ] **Step 3: Build and verify**

Run: `pnpm turbo build --filter=chat-server`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/widget-routes.ts apps/chat-server/src/infra/http/middleware/widget-auth.ts apps/chat-server/src/app.ts
git commit -m "feat(f07): add widget REST routes (create conv, send msg, get config)"
```

---

### Task 6: Widget Socket.IO Namespace

**Files:**

- Create: `apps/chat-server/src/infra/socket/widget-namespace.ts`
- Modify: `apps/chat-server/src/app.ts` (setup namespace)
- Modify: `packages/shared/src/socket-events.ts` (add widget events)

- [ ] **Step 1: Add widget socket events to shared**

In `packages/shared/src/socket-events.ts`, add:

```typescript
// Widget-specific events (visitor-facing):
WIDGET_SEND_MESSAGE: 'widget:send-message',
WIDGET_TYPING_START: 'widget:typing-start',
WIDGET_INCOMING_MESSAGE: 'widget:incoming-message',
WIDGET_TYPING: 'widget:typing',
WIDGET_CONVERSATION_UPDATED: 'widget:conversation-updated',
```

- [ ] **Step 2: Create widget namespace handler**

Create `apps/chat-server/src/infra/socket/widget-namespace.ts`:

```typescript
import type { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { env } from '@repo/env'
import { Message } from '@repo/db-chat/models/message.model'
import { Conversation } from '@repo/db-chat/models/conversation.model'
import { CHAT_LIMITS, CHAT_PUBSUB_CHANNELS, SOCKET_EVENTS } from '@repo/shared'
import type { VisitorTokenPayload } from '../http/middleware/widget-auth'
import type { Logger } from 'pino'
import type { Redis } from 'ioredis'

export function setupWidgetNamespace(
  io: Server,
  logger: Logger,
  redis: Redis
): void {
  const widget = io.of('/widget')

  // Auth middleware — validate visitorToken
  widget.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) {
      return next(new Error('Token ausente'))
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as VisitorTokenPayload
      socket.data.visitor = payload
      next()
    } catch {
      next(new Error('Token expirado'))
    }
  })

  widget.on('connection', (socket: Socket) => {
    const visitor = socket.data.visitor as VisitorTokenPayload
    const room = `widget:${visitor.conversationId}`
    socket.join(room)
    logger.info(
      { conversationId: visitor.conversationId },
      'Widget visitor connected'
    )

    // Rate limiter: track message timestamps
    const messageTimes: number[] = []

    socket.on(
      SOCKET_EVENTS.WIDGET_SEND_MESSAGE,
      async (data: { text: string }, ack?: (result: unknown) => void) => {
        // Rate limit: max 5 msg/sec
        const now = Date.now()
        messageTimes.push(now)
        const recentCount = messageTimes.filter((t) => now - t < 1000).length
        if (recentCount > CHAT_LIMITS.WIDGET_SOCKET_RATE_LIMIT_PER_SEC) {
          ack?.({ success: false, error: 'Rate limit exceeded' })
          return
        }

        if (!data.text?.trim() || data.text.length > 4096) {
          ack?.({ success: false, error: 'Mensagem inválida' })
          return
        }

        const conversation = await Conversation.findOne({
          _id: visitor.conversationId,
          tenantId: visitor.tenantId,
          status: { $ne: 'CLOSED' },
        })

        if (!conversation) {
          ack?.({ success: false, error: 'Conversa encerrada' })
          return
        }

        const message = await Message.create({
          conversationId: visitor.conversationId,
          tenantId: visitor.tenantId,
          senderType: 'CLIENT',
          text: data.text.trim(),
          type: 'TEXT',
          status: 'SENT',
        })

        await Conversation.updateOne(
          { _id: visitor.conversationId },
          {
            $set: {
              lastMessageText: data.text.trim(),
              lastMessageAt: new Date(),
            },
          }
        )

        // Publish to operators via Redis
        await redis.publish(
          CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
          JSON.stringify({
            tenantId: visitor.tenantId,
            conversationId: visitor.conversationId,
            message: message.toObject(),
          })
        )
        await redis.publish(
          CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
          JSON.stringify({
            tenantId: visitor.tenantId,
            conversationId: visitor.conversationId,
          })
        )

        ack?.({ success: true, data: { id: message._id.toString() } })
      }
    )

    socket.on(SOCKET_EVENTS.WIDGET_TYPING_START, () => {
      // Publish typing event to operators
      const operatorRoom = `tenant:${visitor.tenantId}:conversation:${visitor.conversationId}`
      io.of('/').to(operatorRoom).emit(SOCKET_EVENTS.TYPING, {
        conversationId: visitor.conversationId,
        userId: visitor.contactId,
        name: 'Visitante',
      })
    })

    socket.on('disconnect', () => {
      logger.info(
        { conversationId: visitor.conversationId },
        'Widget visitor disconnected'
      )
    })
  })

  // Subscribe to Redis for delivering messages TO visitors
  const subscriber = redis.duplicate()
  subscriber.subscribe(CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE)
  subscriber.subscribe(CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE)

  subscriber.on('message', (channel: string, data: string) => {
    const parsed = JSON.parse(data)

    if (channel === CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE) {
      const { conversationId, message } = parsed
      // Only deliver BOT/AGENT/SYSTEM messages to visitor (not CLIENT — that's their own)
      if (message.senderType !== 'CLIENT') {
        widget
          .to(`widget:${conversationId}`)
          .emit(SOCKET_EVENTS.WIDGET_INCOMING_MESSAGE, { message })
      }
    }

    if (channel === CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE) {
      const { conversationId } = parsed
      widget
        .to(`widget:${conversationId}`)
        .emit(SOCKET_EVENTS.WIDGET_CONVERSATION_UPDATED, { conversationId })
    }
  })
}
```

- [ ] **Step 3: Register namespace in app.ts**

In `apps/chat-server/src/app.ts`, after Socket.IO setup:

```typescript
import { setupWidgetNamespace } from './infra/socket/widget-namespace'

// After main namespace setup:
setupWidgetNamespace(io, app.log, options.redisGeneral)
```

- [ ] **Step 4: Build and verify**

Run: `pnpm turbo build --filter=chat-server --filter=@repo/shared`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/chat-server/src/infra/socket/widget-namespace.ts packages/shared/src/socket-events.ts apps/chat-server/src/app.ts
git commit -m "feat(f07): add Socket.IO /widget namespace for visitor real-time messaging"
```

---

### Task 7: Implement WebChatBroker

**Files:**

- Modify: `apps/chat-worker/src/messaging/web-chat-broker.ts`

- [ ] **Step 1: Implement WebChatBroker**

Replace the placeholder in `apps/chat-worker/src/messaging/web-chat-broker.ts`:

```typescript
import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import { Message } from '@repo/db-chat/models/message.model'
import Redis from 'ioredis'
import { env } from '@repo/env'

export class WebChatBroker implements Broker {
  private redis: Redis

  constructor(_config: Record<string, unknown>) {
    this.redis = new Redis(env.REDIS_URL)
  }

  async connect(_events: BrokerEvents): Promise<void> {
    // WebChat is stateless
  }

  async disconnect(): Promise<void> {
    await this.redis.quit()
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    // WebChatBroker doesn't call an external API.
    // The message is already saved by the send-message-processor.
    // We just need to publish to Redis so the /widget namespace delivers it.
    // The send-message-processor already publishes MESSAGE_STATUS.
    // The INCOMING_MESSAGE pub/sub is handled by the conversation-routes (agent send).
    // So WebChatBroker is effectively a no-op for sending — delivery happens via Redis pub/sub.

    return {
      externalId: `webchat-${Date.now()}`,
      status: 'SENT',
    }
  }

  isConnected(): boolean {
    return true
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `pnpm turbo build --filter=chat-worker`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/messaging/web-chat-broker.ts
git commit -m "feat(f07): implement WebChatBroker (stateless, Redis pub/sub delivery)"
```

---

## Phase 3: Web Chat Widget — Frontend

### Task 8: Create Widget App (Vite + React)

**Files:**

- Create: `apps/widget/package.json`
- Create: `apps/widget/tsconfig.json`
- Create: `apps/widget/vite.config.ts`
- Create: `apps/widget/index.html`
- Create: `apps/widget/src/app.tsx`
- Create: `apps/widget/src/main.tsx`
- Create: `apps/widget/src/lib/constants.ts`
- Create: `apps/widget/src/lib/widget-api.ts`
- Modify: `turbo.json` (add widget to pipeline if needed)
- Modify: `pnpm-workspace.yaml` (already includes apps/\*)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "widget",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "socket.io-client": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "catalog:",
    "vite": "^6.3.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        widget: 'index.html',
        embed: 'src/embed.ts',
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'embed') return 'embed.js'
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
})
```

- [ ] **Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chat Widget</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
```

- [ ] **Step 6: Create src/app.tsx**

```tsx
import { useState } from 'react'
import { WidgetButton } from './components/widget-button'
import { WidgetContainer } from './components/widget-container'

export function App(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const channelId =
    new URLSearchParams(window.location.search).get('channelId') ?? ''

  if (!channelId) {
    return <></>
  }

  return (
    <>
      {!isOpen && <WidgetButton onClick={() => setIsOpen(true)} />}
      {isOpen && (
        <WidgetContainer
          channelId={channelId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
```

- [ ] **Step 7: Create src/embed.ts**

```typescript
;(function () {
  const script = document.currentScript as HTMLScriptElement | null
  if (!script) return

  const channelId = script.getAttribute('data-channel-id')
  if (!channelId) return

  const baseUrl = new URL(script.src).origin

  const iframe = document.createElement('iframe')
  iframe.src = `${baseUrl}/widget/?channelId=${channelId}`
  iframe.style.cssText =
    'position:fixed;bottom:0;right:0;width:100%;height:100%;border:none;z-index:2147483647;pointer-events:none;'
  iframe.setAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-forms allow-popups'
  )
  iframe.setAttribute('allow', 'clipboard-write')

  document.body.appendChild(iframe)

  // Listen for messages from widget iframe to control pointer-events
  window.addEventListener('message', (event) => {
    if (event.origin !== baseUrl) return
    if (event.data?.type === 'widget:open') {
      iframe.style.pointerEvents = 'auto'
    }
    if (event.data?.type === 'widget:close') {
      iframe.style.pointerEvents = 'none'
    }
  })
})()
```

- [ ] **Step 8: Create src/lib/constants.ts**

```typescript
export const CHAT_SERVER_URL =
  import.meta.env.VITE_CHAT_SERVER_URL ?? 'http://localhost:3002'
```

- [ ] **Step 9: Create src/lib/widget-api.ts**

```typescript
import { CHAT_SERVER_URL } from './constants'

let visitorToken: string | null = null

export function setVisitorToken(token: string): void {
  visitorToken = token
}

export function getVisitorToken(): string | null {
  return visitorToken
}

export async function widgetFetch<TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (visitorToken) {
    headers['Authorization'] = `Bearer ${visitorToken}`
  }

  const response = await fetch(`${CHAT_SERVER_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      ((error as Record<string, unknown>).message as string) ??
        `HTTP ${response.status}`
    )
  }

  return response.json() as Promise<TResponse>
}
```

- [ ] **Step 10: Install deps and verify build**

```bash
cd /home/artur/projects && pnpm install
pnpm turbo build --filter=widget
```

Expected: Build succeeds, produces `apps/widget/dist/`.

- [ ] **Step 11: Commit**

```bash
git add apps/widget/
git commit -m "feat(f07): scaffold widget app with Vite + React + embed script"
```

---

### Task 9: Widget UI Components

**Files:**

- Create: `apps/widget/src/components/widget-button.tsx`
- Create: `apps/widget/src/components/widget-container.tsx`
- Create: `apps/widget/src/components/pre-chat-form.tsx`
- Create: `apps/widget/src/components/chat-view.tsx`
- Create: `apps/widget/src/components/message-bubble.tsx`
- Create: `apps/widget/src/components/message-input.tsx`
- Create: `apps/widget/src/hooks/use-widget-socket.ts`
- Create: `apps/widget/src/hooks/use-widget-state.ts`
- Create: `apps/widget/src/styles.css`

This is the largest task. Break into sub-steps:

- [ ] **Step 1: Create styles.css with widget theme**

Create `apps/widget/src/styles.css` — lightweight CSS, no Tailwind (bundle size):

```css
:root {
  --widget-primary: #1f4b5f;
  --widget-bg: #ffffff;
  --widget-bg-bubble-sent: #1f4b5f;
  --widget-bg-bubble-received: #f1f5f9;
  --widget-text: #0f172a;
  --widget-text-secondary: #64748b;
  --widget-text-on-primary: #ffffff;
  --widget-border: #e2e8f0;
  --widget-radius: 12px;
  --widget-radius-bubble: 16px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --widget-bg: #0f172a;
    --widget-bg-bubble-sent: #1f4b5f;
    --widget-bg-bubble-received: #1e293b;
    --widget-text: #f1f5f9;
    --widget-text-secondary: #94a3b8;
    --widget-text-on-primary: #ffffff;
    --widget-border: #334155;
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: transparent;
  color: var(--widget-text);
}
```

Import in `src/main.tsx`:

```tsx
import './styles.css'
```

- [ ] **Step 2: Create widget-button.tsx**

```tsx
interface WidgetButtonProps {
  onClick: () => void
}

export function WidgetButton({
  onClick,
}: WidgetButtonProps): React.ReactElement {
  return (
    <button
      onClick={() => {
        onClick()
        window.parent.postMessage({ type: 'widget:open' }, '*')
      }}
      aria-label="Abrir chat"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        backgroundColor: 'var(--widget-primary)',
        color: 'var(--widget-text-on-primary)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        transition: 'transform 200ms ease-out',
        pointerEvents: 'auto',
      }}
    >
      💬
    </button>
  )
}
```

Note: In the final implementation, replace the emoji with an inline SVG (MessageCircle icon). The spec forbids emoji as icons — use SVG.

- [ ] **Step 3: Create use-widget-state.ts**

```tsx
import { useState, useCallback } from 'react'
import {
  widgetFetch,
  setVisitorToken,
  getVisitorToken,
} from '../lib/widget-api'

interface WidgetConfig {
  channelId: string
  name: string
  widgetColor: string
  welcomeMessage: string
}

interface WidgetState {
  view: 'loading' | 'form' | 'chat'
  config: WidgetConfig | null
  conversationId: string | null
  error: string | null
}

export function useWidgetState(channelId: string) {
  const [state, setState] = useState<WidgetState>({
    view: 'loading',
    config: null,
    conversationId: null,
    error: null,
  })

  const loadConfig = useCallback(async () => {
    try {
      const response = await widgetFetch<{
        success: boolean
        data: WidgetConfig
      }>(`/widget/config/${channelId}`)
      setState((prev) => ({ ...prev, view: 'form', config: response.data }))
    } catch {
      setState((prev) => ({
        ...prev,
        view: 'form',
        error: 'Canal indisponível',
      }))
    }
  }, [channelId])

  const startConversation = useCallback(
    async (data: { name: string; phone: string; email?: string }) => {
      const response = await widgetFetch<{
        success: boolean
        data: { conversationId: string; visitorToken: string }
      }>('/widget/conversations', {
        method: 'POST',
        body: JSON.stringify({ channelId, ...data }),
      })

      setVisitorToken(response.data.visitorToken)
      setState((prev) => ({
        ...prev,
        view: 'chat',
        conversationId: response.data.conversationId,
      }))
    },
    [channelId]
  )

  return { state, loadConfig, startConversation }
}
```

- [ ] **Step 4: Create use-widget-socket.ts**

```tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { CHAT_SERVER_URL } from '../lib/constants'
import { getVisitorToken } from '../lib/widget-api'

interface MessageData {
  id: string
  text: string | null
  senderType: 'CLIENT' | 'AGENT' | 'BOT' | 'SYSTEM'
  senderName: string | null
  type: string
  mediaUrl: string | null
  createdAt: string
}

export function useWidgetSocket(conversationId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!conversationId) return

    const token = getVisitorToken()
    if (!token) return

    const socket = io(`${CHAT_SERVER_URL}/widget`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    socket.on('widget:incoming-message', (data: { message: MessageData }) => {
      setMessages((prev) => [...prev, data.message])
    })

    socket.on('widget:typing', (data: { name: string }) => {
      setTypingUser(data.name)
      setTimeout(() => setTypingUser(null), 3000)
    })

    socket.on('widget:conversation-updated', () => {
      // Could refresh conversation status if needed
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId])

  const sendMessage = useCallback((text: string) => {
    if (!socketRef.current) return

    const optimisticMsg: MessageData = {
      id: `temp-${Date.now()}`,
      text,
      senderType: 'CLIENT',
      senderName: null,
      type: 'TEXT',
      mediaUrl: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    socketRef.current.emit(
      'widget:send-message',
      { text },
      (result: { success: boolean; data?: { id: string } }) => {
        if (result.success && result.data) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticMsg.id ? { ...m, id: result.data!.id } : m
            )
          )
        }
      }
    )
  }, [])

  const emitTyping = useCallback(() => {
    socketRef.current?.emit('widget:typing-start')
  }, [])

  return {
    messages,
    setMessages,
    sendMessage,
    emitTyping,
    typingUser,
    isConnected,
  }
}
```

- [ ] **Step 5: Create pre-chat-form.tsx**

```tsx
import { useState } from 'react'

interface PreChatFormProps {
  welcomeMessage: string
  widgetColor: string
  onSubmit: (data: {
    name: string
    phone: string
    email?: string
  }) => Promise<void>
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function PreChatForm({
  welcomeMessage,
  widgetColor,
  onSubmit,
}: PreChatFormProps): React.ReactElement {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const cleanPhone = '+55' + phone.replace(/\D/g, '')
    try {
      await onSubmit({
        name: name.trim(),
        phone: cleanPhone,
        email: email.trim() || undefined,
      })
    } catch {
      setError('Erro ao iniciar conversa. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--widget-border)',
    backgroundColor: 'var(--widget-bg)',
    color: 'var(--widget-text)',
    fontSize: 14,
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--widget-text)',
    marginBottom: 4,
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flex: 1,
      }}
    >
      <p
        style={{
          fontSize: 14,
          color: 'var(--widget-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {welcomeMessage}
      </p>

      <div>
        <label style={labelStyle}>Nome *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome completo"
          required
          minLength={2}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Telefone *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="(11) 99999-9999"
          required
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          style={inputStyle}
        />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

      <button
        type="submit"
        disabled={
          isSubmitting ||
          name.trim().length < 2 ||
          phone.replace(/\D/g, '').length < 10
        }
        style={{
          padding: '12px 16px',
          borderRadius: 8,
          border: 'none',
          backgroundColor: widgetColor,
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          opacity: isSubmitting ? 0.7 : 1,
        }}
      >
        {isSubmitting ? 'Iniciando...' : 'Iniciar conversa'}
      </button>

      <p
        style={{
          fontSize: 11,
          color: 'var(--widget-text-secondary)',
          textAlign: 'center',
        }}
      >
        Seus dados estão protegidos conforme LGPD
      </p>
    </form>
  )
}
```

- [ ] **Step 6: Create message-bubble.tsx**

```tsx
interface MessageBubbleProps {
  text: string | null
  senderType: 'CLIENT' | 'AGENT' | 'BOT' | 'SYSTEM'
  senderName: string | null
  createdAt: string
}

export function MessageBubble({
  text,
  senderType,
  senderName,
  createdAt,
}: MessageBubbleProps): React.ReactElement {
  const isSystem = senderType === 'SYSTEM'
  const isSent = senderType === 'CLIENT'
  const time = new Date(createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <span
          style={{
            fontSize: 12,
            color: 'var(--widget-text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {text}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isSent ? 'flex-end' : 'flex-start',
        padding: '2px 0',
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '8px 12px',
          borderRadius: 'var(--widget-radius-bubble)',
          backgroundColor: isSent
            ? 'var(--widget-bg-bubble-sent)'
            : 'var(--widget-bg-bubble-received)',
          color: isSent
            ? 'var(--widget-text-on-primary)'
            : 'var(--widget-text)',
          borderBottomRightRadius: isSent ? 4 : 'var(--widget-radius-bubble)',
          borderBottomLeftRadius: isSent ? 'var(--widget-radius-bubble)' : 4,
        }}
      >
        {senderName && !isSent && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--widget-primary)',
              marginBottom: 2,
            }}
          >
            {senderName}
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
          {text}
        </div>
        <div
          style={{
            fontSize: 10,
            opacity: 0.7,
            textAlign: 'right',
            marginTop: 2,
          }}
        >
          {time}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create message-input.tsx**

```tsx
import { useState, useRef } from 'react'

interface MessageInputProps {
  onSend: (text: string) => void
  onTyping: () => void
  disabled: boolean
}

export function MessageInput({
  onSend,
  onTyping,
  disabled,
}: MessageInputProps): React.ReactElement {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSend(text.trim())
    setText('')
    inputRef.current?.focus()
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        borderTop: '1px solid var(--widget-border)',
        backgroundColor: 'var(--widget-bg)',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onTyping()
        }}
        placeholder="Digite sua mensagem..."
        disabled={disabled}
        style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid var(--widget-border)',
          backgroundColor: 'var(--widget-bg)',
          color: 'var(--widget-text)',
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="Enviar mensagem"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          border: 'none',
          backgroundColor: 'var(--widget-primary)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ➤
      </button>
    </form>
  )
}
```

- [ ] **Step 8: Create chat-view.tsx**

```tsx
import { useEffect, useRef } from 'react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { useWidgetSocket } from '../hooks/use-widget-socket'
import { widgetFetch } from '../lib/widget-api'

interface ChatViewProps {
  conversationId: string
}

export function ChatView({
  conversationId,
}: ChatViewProps): React.ReactElement {
  const { messages, setMessages, sendMessage, emitTyping, typingUser } =
    useWidgetSocket(conversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing messages on mount
  useEffect(() => {
    widgetFetch<{
      success: boolean
      data: Array<{
        _id: string
        text: string | null
        senderType: string
        senderName: string | null
        type: string
        mediaUrl: string | null
        createdAt: string
      }>
    }>(`/widget/conversations/${conversationId}`).then((response) => {
      const mapped = response.data.map((m) => ({
        id: m._id,
        text: m.text,
        senderType: m.senderType as 'CLIENT' | 'AGENT' | 'BOT' | 'SYSTEM',
        senderName: m.senderName,
        type: m.type,
        mediaUrl: m.mediaUrl,
        createdAt: m.createdAt,
      }))
      setMessages(mapped)
    })
  }, [conversationId, setMessages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            senderType={msg.senderType}
            senderName={msg.senderName}
            createdAt={msg.createdAt}
          />
        ))}
        {typingUser && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--widget-text-secondary)',
              padding: '4px 0',
              fontStyle: 'italic',
            }}
          >
            {typingUser} está digitando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput
        onSend={sendMessage}
        onTyping={emitTyping}
        disabled={false}
      />
    </div>
  )
}
```

- [ ] **Step 9: Create widget-container.tsx**

```tsx
import { useEffect } from 'react'
import { useWidgetState } from '../hooks/use-widget-state'
import { PreChatForm } from './pre-chat-form'
import { ChatView } from './chat-view'

interface WidgetContainerProps {
  channelId: string
  onClose: () => void
}

export function WidgetContainer({
  channelId,
  onClose,
}: WidgetContainerProps): React.ReactElement {
  const { state, loadConfig, startConversation } = useWidgetState(channelId)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleClose = () => {
    onClose()
    window.parent.postMessage({ type: 'widget:close' }, '*')
  }

  const widgetColor = state.config?.widgetColor ?? '#1f4b5f'

  const isFullscreen = window.innerWidth <= 480

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isFullscreen ? 0 : 24,
        right: isFullscreen ? 0 : 24,
        width: isFullscreen ? '100vw' : 380,
        height: isFullscreen ? '100dvh' : 520,
        borderRadius: isFullscreen ? 0 : 'var(--widget-radius)',
        backgroundColor: 'var(--widget-bg)',
        boxShadow: isFullscreen ? 'none' : '0 8px 30px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: isFullscreen ? 'none' : '1px solid var(--widget-border)',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: widgetColor,
          color: '#ffffff',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15 }}>
          {state.config?.name ?? 'Chat'}
        </span>
        <button
          onClick={handleClose}
          aria-label="Fechar chat"
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            fontSize: 18,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      {state.view === 'loading' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: 'var(--widget-text-secondary)' }}>
            Carregando...
          </span>
        </div>
      )}

      {state.view === 'form' && state.config && (
        <PreChatForm
          welcomeMessage={state.config.welcomeMessage}
          widgetColor={widgetColor}
          onSubmit={startConversation}
        />
      )}

      {state.view === 'chat' && state.conversationId && (
        <ChatView conversationId={state.conversationId} />
      )}

      {/* Footer */}
      <div
        style={{
          padding: '6px 16px',
          borderTop: '1px solid var(--widget-border)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--widget-text-secondary)' }}>
          Powered by Bens Seguros
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Build widget and verify bundle size**

```bash
cd /home/artur/projects && pnpm turbo build --filter=widget
ls -lh apps/widget/dist/assets/
```

Expected: Build succeeds, main JS bundle < 60KB gzipped.

- [ ] **Step 11: Commit**

```bash
git add apps/widget/src/
git commit -m "feat(f07): implement widget UI components (form, chat, bubbles, input)"
```

---

## Phase 4: Operator — Unified Inbox

### Task 10: Channel Icon Component and Conversation List Update

**Files:**

- Create: `apps/web/src/features/chat/components/channel-icon.tsx`
- Modify: `apps/web/src/features/chat/components/conversation-list-item.tsx`
- Modify: `apps/web/src/features/chat/components/conversation-list.tsx`

- [ ] **Step 1: Create channel icon component**

Create `apps/web/src/features/chat/components/channel-icon.tsx`:

```tsx
import { Globe, MessageCircle } from 'lucide-react'
import type { ChannelType } from '@repo/shared'
import { CHANNEL_META } from '@repo/shared'

interface ChannelIconProps {
  channelType: ChannelType
  size?: number
}

export function ChannelIcon({
  channelType,
  size = 16,
}: ChannelIconProps): React.ReactElement {
  const meta = CHANNEL_META[channelType]
  const color = meta.color

  switch (channelType) {
    case 'WHATSAPP':
      return <MessageCircle size={size} color={color} strokeWidth={2} />
    case 'WEB_CHAT':
      return <Globe size={size} color={color} strokeWidth={2} />
    case 'MESSENGER':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.197 5.43 3.15 7.148V22l3.405-1.868A11.18 11.18 0 0012 20.486c5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.062 12.455l-2.54-2.708L5.8 14.545l5.148-5.455 2.602 2.708L18.2 8.91l-5.138 5.545z" />
        </svg>
      )
    case 'INSTAGRAM':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      )
  }
}
```

- [ ] **Step 2: Add channel icon to ConversationListItem**

In `apps/web/src/features/chat/components/conversation-list-item.tsx`, add the icon before the display name:

```tsx
import { ChannelIcon } from './channel-icon'

// Inside the component, near the display name:
// Add before the name text:
;<ChannelIcon channelType={conversation.channelType ?? 'WHATSAPP'} size={14} />
```

The exact edit depends on the current JSX structure. Add the icon in a flex row with the name:

```tsx
<div className="flex items-center gap-1.5">
  <ChannelIcon channelType={conversation.channelType ?? 'WHATSAPP'} size={14} />
  <span className="truncate font-medium">{displayName}</span>
</div>
```

- [ ] **Step 3: Add channel filter to ConversationList**

In `apps/web/src/features/chat/components/conversation-list.tsx`, add a channel filter dropdown in the toolbar area after the existing status tabs:

```tsx
import { CHANNEL_META, type ChannelType } from '@repo/shared'

// Add state:
const [channelFilter, setChannelFilter] = useState<ChannelType | 'ALL'>('ALL')

// Filter conversations client-side:
const filteredConversations = conversations.filter((conv) => {
  if (channelFilter === 'ALL') return true
  return conv.channelType === channelFilter
})
```

Add a simple dropdown or chip in the filter area using shadcn/ui `Select` or `DropdownMenu`.

- [ ] **Step 4: Build and verify**

Run: `pnpm turbo build --filter=web`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/chat/components/channel-icon.tsx apps/web/src/features/chat/components/conversation-list-item.tsx apps/web/src/features/chat/components/conversation-list.tsx
git commit -m "feat(f07): add channel icons and filter to unified inbox"
```

---

### Task 11: Update Channel Management in Settings

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-form-sheet.tsx`
- Create: `apps/web/src/features/channels/components/embed-code-dialog.tsx`
- Modify: `apps/web/src/features/channels/components/channels-table.tsx`
- Modify: `apps/chat-server/src/infra/http/routes/channel-routes.ts`

- [ ] **Step 1: Update channel-routes to accept new types**

In `apps/chat-server/src/infra/http/routes/channel-routes.ts`, update the create channel Zod schema:

```typescript
const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['WHATSAPP', 'WEB_CHAT', 'MESSENGER', 'INSTAGRAM']),
  brokerType: z.enum(['BAILEYS', 'META', 'WEB_CHAT']),
  phoneNumber: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})
```

For WEB_CHAT, set `brokerType: 'WEB_CHAT'` and `status: 'CONNECTED'` automatically (always online):

```typescript
// In create handler:
if (body.type === 'WEB_CHAT') {
  body.brokerType = 'WEB_CHAT'
  // WEB_CHAT channels are always "connected"
}
```

- [ ] **Step 2: Update channel form for new types**

In the channel form sheet, add conditional fields based on channel type:

- **WEB_CHAT:** widgetColor (color picker), welcomeMessage (textarea), offlineMessage (textarea), allowedOrigins (tag input)
- **MESSENGER:** metaPageId (text), metaToken (password)
- **INSTAGRAM:** metaPageId (text), metaToken (password)

These fields are stored in the `config` object on save.

- [ ] **Step 3: Create embed code dialog**

Create `apps/web/src/features/channels/components/embed-code-dialog.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/dialog'
import { Button } from '@repo/ui/button'

interface EmbedCodeDialogProps {
  channelId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmbedCodeDialog({
  channelId,
  open,
  onOpenChange,
}: EmbedCodeDialogProps): React.ReactElement {
  const embedCode = `<script src="${process.env.NEXT_PUBLIC_CHAT_SERVER_URL}/widget/embed.js" data-channel-id="${channelId}" defer></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode)
    // Show toast
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Código de Embed</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Adicione este código no HTML do seu site, antes do {'</body>'}:
        </p>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
          <code>{embedCode}</code>
        </pre>
        <Button onClick={handleCopy}>Copiar código</Button>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Update channels table to show new types**

Add channel icon and type label in the table. For WEB_CHAT channels, add an "Embed" action button that opens the EmbedCodeDialog.

- [ ] **Step 5: Build and verify**

Run: `pnpm turbo build --filter=web --filter=chat-server`

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/channels/ apps/chat-server/src/infra/http/routes/channel-routes.ts
git commit -m "feat(f07): update channel settings for WEB_CHAT, MESSENGER, INSTAGRAM types"
```

---

### Task 12: Update Contact Profile for Multi-Channel

**Files:**

- Modify: `apps/web/src/features/chat/components/contact-profile.tsx`

- [ ] **Step 1: Show channel-specific contact info**

Update the contact profile panel to display fields based on the contact's source:

```tsx
import { ChannelIcon } from './channel-icon'

// In the contact details section:
{
  contact.whatsappPhone && (
    <div className="flex items-center gap-2 text-sm">
      <Phone size={14} />
      <span>{contact.whatsappPhone}</span>
    </div>
  )
}
{
  contact.email && (
    <div className="flex items-center gap-2 text-sm">
      <Mail size={14} />
      <span>{contact.email}</span>
    </div>
  )
}
{
  contact.source && (
    <div className="flex items-center gap-2 text-sm">
      <ChannelIcon channelType={contact.source} size={14} />
      <span>{CHANNEL_META[contact.source].label}</span>
    </div>
  )
}
```

Show "Ver ficha no ERP" link if `contact.clientId` exists (already implemented for WhatsApp contacts, should work for all).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/chat/components/contact-profile.tsx
git commit -m "feat(f07): show channel-specific info in contact profile panel"
```

---

## Phase 5: Messenger

### Task 13: Implement MessengerBroker

**Files:**

- Modify: `apps/chat-worker/src/messaging/messenger-broker.ts`

- [ ] **Step 1: Implement MessengerBroker**

Replace the placeholder:

```typescript
import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker'
import pino from 'pino'

const logger = pino({ name: 'messenger-broker' })
const META_API_URL = 'https://graph.facebook.com/v21.0'

export class MessengerBroker implements Broker {
  private readonly pageId: string
  private readonly accessToken: string

  constructor(config: Record<string, unknown>) {
    this.pageId = config.metaPageId as string
    this.accessToken = config.metaToken as string

    if (!this.pageId || !this.accessToken) {
      throw new Error(
        'MessengerBroker requires metaPageId and metaToken in config'
      )
    }
  }

  async connect(_events: BrokerEvents): Promise<void> {
    // Stateless — no persistent connection
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    const body = this.buildPayload(payload)

    const response = await fetch(`${META_API_URL}/${this.pageId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    })

    const result = (await response.json()) as {
      message_id?: string
      error?: { message: string; code: number }
    }

    if (result.error) {
      logger.error(
        { error: result.error, to: payload.to },
        'Messenger send failed'
      )
      return {
        externalId: '',
        status: 'FAILED',
        errorCode: String(result.error.code),
      }
    }

    return { externalId: result.message_id ?? '', status: 'SENT' }
  }

  isConnected(): boolean {
    return true
  }

  private buildPayload(payload: MessagePayload): Record<string, unknown> {
    const base = { recipient: { id: payload.to } }

    if (payload.type === 'TEXT' || !payload.mediaUrl) {
      return { ...base, message: { text: payload.text ?? '' } }
    }

    const attachmentType =
      payload.type === 'DOCUMENT' ? 'file' : payload.type.toLowerCase()
    return {
      ...base,
      message: {
        attachment: {
          type: attachmentType,
          payload: { url: payload.mediaUrl, is_reusable: true },
        },
      },
    }
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `pnpm turbo build --filter=chat-worker`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/messaging/messenger-broker.ts
git commit -m "feat(f07): implement MessengerBroker (Meta Graph API for Facebook Messenger)"
```

---

### Task 14: Handle Messenger Webhooks

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/webhook-routes.ts`
- Modify: `apps/chat-worker/src/processors/incoming-message-processor.ts`

- [ ] **Step 1: Extend webhook handler for Messenger/Instagram payloads**

In `webhook-routes.ts`, the POST handler currently only processes WhatsApp payloads (`entry[].changes[]`). Add handling for Messenger/Instagram payloads (`entry[].messaging[]`):

```typescript
// After existing WhatsApp processing:
if (body.object === 'page' || body.object === 'instagram') {
  const source = body.object === 'page' ? 'MESSENGER' : 'INSTAGRAM'

  for (const entry of body.entry) {
    const accountId = entry.id
    const messaging = entry.messaging as
      | Array<{
          sender: { id: string }
          recipient: { id: string }
          timestamp: number
          message?: {
            mid: string
            text?: string
            attachments?: Array<{ type: string; payload: { url: string } }>
          }
        }>
      | undefined

    if (!messaging) continue

    for (const event of messaging) {
      if (!event.message) continue

      await processIncomingQueue.add(
        `${source}-${event.message.mid}`,
        {
          source,
          accountId,
          senderId: event.sender.id,
          recipientId: event.recipient.id,
          messageId: event.message.mid,
          text: event.message.text ?? null,
          attachments: event.message.attachments ?? [],
          timestamp: event.timestamp,
        },
        { removeOnComplete: 100, removeOnFail: 100 }
      )
    }
  }
}
```

- [ ] **Step 2: Extend incoming message processor for Messenger/Instagram**

In `incoming-message-processor.ts`, add handling for `source === 'MESSENGER'` and `source === 'INSTAGRAM'`:

```typescript
if (data.source === 'MESSENGER' || data.source === 'INSTAGRAM') {
  const { senderId, accountId, messageId, text, timestamp, source } = data

  // Deduplicate
  const existing = await Message.findOne({
    externalId: messageId,
    tenantId: { $exists: true },
  })
  if (existing) return

  // Find channel by accountId (metaPageId in config)
  const channelType = source === 'MESSENGER' ? 'MESSENGER' : 'INSTAGRAM'
  const channel = await Channel.findOne({
    type: channelType,
    isActive: true,
    'config.metaPageId': accountId,
  })
  if (!channel) {
    logger.warn({ accountId, source }, 'No channel found for incoming message')
    return
  }

  const tenantId = channel.tenantId
  const contactField = source === 'MESSENGER' ? 'facebookId' : 'instagramId'

  // Upsert contact
  const contact = await Contact.findOneAndUpdate(
    { tenantId, [contactField]: senderId },
    {
      $set: { source: channelType },
      $setOnInsert: { tenantId, [contactField]: senderId },
    },
    { upsert: true, new: true }
  )

  // Fetch name from Meta API if new contact and no name
  if (!contact.name && !contact.pushName) {
    try {
      const profileRes = await fetch(
        `https://graph.facebook.com/v21.0/${senderId}?fields=name&access_token=${(channel.config as Record<string, unknown>).metaToken}`
      )
      const profile = (await profileRes.json()) as { name?: string }
      if (profile.name) {
        await Contact.updateOne(
          { _id: contact._id },
          { $set: { name: profile.name, pushName: profile.name } }
        )
        contact.name = profile.name
        contact.pushName = profile.name
      }
    } catch {
      // Non-critical, continue
    }
  }

  // Find or create conversation
  const conversation = await Conversation.findOneAndUpdate(
    {
      tenantId,
      channelId: channel._id.toString(),
      contactId: contact._id.toString(),
      status: { $ne: 'CLOSED' },
    },
    {
      $set: {
        lastMessageText: text,
        lastMessageAt: new Date(timestamp * 1000),
      },
      $setOnInsert: {
        tenantId,
        channelId: channel._id.toString(),
        contactId: contact._id.toString(),
        status: channel.aiAgentId ? 'BOT_ACTIVE' : 'WAITING_HUMAN',
      },
    },
    { upsert: true, new: true, includeResultMetadata: true }
  )

  const isNew = conversation.lastErrorObject?.upserted

  // Create message
  const message = await Message.create({
    conversationId: conversation.value._id.toString(),
    tenantId,
    senderType: 'CLIENT',
    senderName: contact.pushName ?? contact.name ?? null,
    text,
    type: 'TEXT',
    status: 'DELIVERED',
    externalId: messageId,
  })

  // Publish events
  const redis = app.redis // Note: need redis access from processor context
  await redis.publish(
    CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
    JSON.stringify({
      tenantId,
      conversationId: conversation.value._id.toString(),
      message: message.toObject(),
    })
  )

  if (isNew) {
    await redis.publish(
      CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
      JSON.stringify({
        tenantId,
        conversationId: conversation.value._id.toString(),
      })
    )
  }

  await redis.publish(
    CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
    JSON.stringify({
      tenantId,
      conversationId: conversation.value._id.toString(),
    })
  )

  // AI bot if applicable
  if (conversation.value.status === 'BOT_ACTIVE') {
    await aiBotQueue.add(
      'ai-bot',
      {
        tenantId,
        conversationId: conversation.value._id.toString(),
        messageId: message._id.toString(),
      },
      {
        jobId: `ai-bot-${conversation.value._id}`,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    )
  }
}
```

- [ ] **Step 3: Build and verify**

Run: `pnpm turbo build --filter=chat-server --filter=chat-worker`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/webhook-routes.ts apps/chat-worker/src/processors/incoming-message-processor.ts
git commit -m "feat(f07): handle Messenger/Instagram webhooks in incoming message flow"
```

---

## Phase 6: Instagram

### Task 15: Implement InstagramBroker

**Files:**

- Modify: `apps/chat-worker/src/messaging/instagram-broker.ts`

- [ ] **Step 1: Implement InstagramBroker**

Replace the placeholder:

```typescript
import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker'
import pino from 'pino'

const logger = pino({ name: 'instagram-broker' })
const META_API_URL = 'https://graph.facebook.com/v21.0'

// Instagram DM limitations:
// - 24h messaging window (must reply within 24h of last user message)
// - Only TEXT and IMAGE supported (no audio, video, or document)
// - Story reply context available via message.reply_to.story

export class InstagramBroker implements Broker {
  private readonly pageId: string
  private readonly accessToken: string

  constructor(config: Record<string, unknown>) {
    this.pageId = config.metaPageId as string
    this.accessToken = config.metaToken as string

    if (!this.pageId || !this.accessToken) {
      throw new Error(
        'InstagramBroker requires metaPageId and metaToken in config'
      )
    }
  }

  async connect(_events: BrokerEvents): Promise<void> {
    // Stateless
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    // Instagram only supports TEXT and IMAGE
    if (payload.type !== 'TEXT' && payload.type !== 'IMAGE') {
      logger.warn(
        { type: payload.type },
        'Instagram DM does not support this media type, sending as text'
      )
    }

    const body = this.buildPayload(payload)

    const response = await fetch(`${META_API_URL}/${this.pageId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    })

    const result = (await response.json()) as {
      message_id?: string
      error?: { message: string; code: number }
    }

    if (result.error) {
      logger.error(
        { error: result.error, to: payload.to },
        'Instagram send failed'
      )
      return {
        externalId: '',
        status: 'FAILED',
        errorCode: String(result.error.code),
      }
    }

    return { externalId: result.message_id ?? '', status: 'SENT' }
  }

  isConnected(): boolean {
    return true
  }

  private buildPayload(payload: MessagePayload): Record<string, unknown> {
    const base = { recipient: { id: payload.to } }

    if (payload.type === 'IMAGE' && payload.mediaUrl) {
      return {
        ...base,
        message: {
          attachment: {
            type: 'image',
            payload: { url: payload.mediaUrl },
          },
        },
      }
    }

    // Default to text for all other types
    return { ...base, message: { text: payload.text ?? '' } }
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `pnpm turbo build --filter=chat-worker`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/messaging/instagram-broker.ts
git commit -m "feat(f07): implement InstagramBroker (Meta Graph API for Instagram DM)"
```

---

### Task 16: Integration Smoke Test

- [ ] **Step 1: Run full build**

```bash
pnpm turbo build
```

Expected: All apps build successfully.

- [ ] **Step 2: Run typecheck**

```bash
pnpm turbo typecheck
```

Expected: Zero type errors.

- [ ] **Step 3: Run lint**

```bash
pnpm turbo lint
```

Expected: Zero lint errors.

- [ ] **Step 4: Run existing tests**

```bash
pnpm turbo test
```

Expected: All existing tests pass (no regressions).

- [ ] **Step 5: Manual integration test checklist**

- [ ] Start dev environment: `docker compose up -d && pnpm dev`
- [ ] Create a WEB_CHAT channel in Settings > Canais
- [ ] Copy embed code, add to a test HTML page
- [ ] Open test page, verify widget button appears
- [ ] Fill pre-chat form, verify conversation appears in operator panel
- [ ] Send messages from widget, verify they appear for operator
- [ ] Reply as operator, verify messages appear in widget
- [ ] Verify channel icon shows in conversation list
- [ ] Verify channel filter works

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(f07): integration fixes from smoke test"
```
