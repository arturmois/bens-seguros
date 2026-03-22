# Fase 5: Chat & Messaging - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar sistema completo de chat em tempo real: Mongoose models, Broker pattern (Baileys primary + Meta fallback), conversations com state machine DDD Full, Socket.IO real-time com presence/typing/unread, BullMQ job processing, auto-close 24h, catch-up on reconnect, e frontend integrado.

**Architecture:** Chat-server (Fastify + Socket.IO) gerencia conversas e mensagens via REST + WebSocket. Chat-worker (BullMQ) processa envio/recebimento de mensagens e mantem conexao Baileys. Redis pub/sub conecta os dois. MongoDB via Mongoose para persistencia do dominio de chat. Conversation e DDD Full com state machine (4 estados). AI Bot e stub que escala imediatamente para fila humana.

**Tech Stack:** Mongoose 8, Socket.IO 4, BullMQ 5, Baileys 7, Redis pub/sub, Zod, Fastify 5, tsyringe (DI), React Query, date-fns.

**Scope C:** Plano base + transfer/devolver fila + auto-close 24h + unread counts + presence/typing + catch-up reconnect + DLQ + error classification + AI bot stub.

**Deferred:** AI bot real (Fase 6), media R2 upload, lead capture cross-DB, historico lateral.

**Spec:** `docs/CHAT-SPEC.md` | **Architecture:** `docs/ARCHITECTURE-DECISIONS.md` (GAP-7)

**Depends on:** Fase 1 completa (Auth + Multi-tenancy)

**Skills to load:** `ui-ux-pro-max` (Task 10), `shadcn` (Task 10), `vercel-react-best-practices` (Tasks 9-10)
**Docs to read:** `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`, `docs/CHAT-SPEC.md`, `docs/ARCHITECTURE-DECISIONS.md`

---

## File Structure

```
packages/db-chat/src/
├── models/
│   ├── channel.model.ts
│   ├── conversation.model.ts
│   ├── message.model.ts
│   ├── contact.model.ts
│   ├── unread-count.model.ts
│   ├── baileys-auth-state.model.ts
│   └── ai-agent.model.ts          # stub config model
├── connection.ts                    # (exists)
└── index.ts                         # (exists, update exports)

packages/shared/src/
├── socket-events.ts                 # (exists, update events)
├── chat-constants.ts                # NEW: queue names, limits
└── index.ts                         # (exists, update exports)

apps/chat-server/src/
├── domain/
│   ├── conversation.ts              # DDD Full entity + state machine
│   ├── conversation.spec.ts         # TDD tests for state transitions
│   ├── types.ts                     # Domain types (ConversationData, MessageData, ContactData, etc.)
│   ├── errors.ts                    # Domain errors (ConversationNotFound, InvalidTransition, etc.)
│   └── ports/
│       ├── conversation-repository.ts
│       ├── message-repository.ts
│       └── contact-repository.ts
├── application/
│   ├── save-incoming-message.ts
│   ├── save-incoming-message.spec.ts
│   ├── send-message.ts
│   ├── send-message.spec.ts
│   ├── list-conversations.ts
│   ├── get-conversation.ts
│   ├── assign-conversation.ts
│   ├── assign-conversation.spec.ts
│   ├── transfer-conversation.ts
│   ├── return-to-queue.ts
│   ├── close-conversation.ts
│   └── mark-as-read.ts
├── infra/
│   ├── http/
│   │   ├── routes/
│   │   │   ├── conversation-routes.ts
│   │   │   ├── channel-routes.ts
│   │   │   └── webhook-routes.ts
│   │   └── middleware/
│   │       └── chat-auth-middleware.ts
│   ├── socket/
│   │   ├── socket-auth.ts
│   │   └── socket-handler.ts
│   ├── repository/
│   │   ├── mongoose-conversation-repository.ts
│   │   ├── mongoose-message-repository.ts
│   │   └── mongoose-contact-repository.ts
│   ├── queue/
│   │   ├── queue-names.ts
│   │   └── queue-producer.ts
│   ├── pubsub/
│   │   ├── redis-publisher.ts
│   │   └── redis-subscriber.ts
│   └── di/
│       └── registry.ts
├── app.ts                            # (exists, wire routes + socket + pubsub)
└── index.ts                          # (exists, add MongoDB connect + DI init)

apps/chat-worker/src/
├── messaging/
│   ├── broker.ts                     # Broker interface
│   ├── baileys-broker.ts
│   ├── meta-broker.ts
│   ├── broker-factory.ts
│   └── baileys-manager.ts           # Connection lifecycle + MongoDB auth
├── processors/
│   ├── send-message-processor.ts
│   ├── incoming-message-processor.ts
│   ├── auto-close-processor.ts
│   └── ai-bot-processor.ts          # stub: immediately escalates
├── baileys/
│   └── baileys-auth-store.ts        # MongoDB-backed auth state
└── index.ts                          # (exists, wire processors + baileys)

apps/web/src/features/chat/
├── components/
│   ├── chat-layout.tsx               # (exists, adapt for domain types)
│   ├── conversation-list.tsx         # (exists, adapt + add status filters)
│   ├── chat-area.tsx                 # (exists, adapt + add agent actions)
│   ├── message-bubble.tsx            # NEW: extracted from chat-area
│   ├── chat-header.tsx               # NEW: agent actions (Assumir, Transferir, Finalizar)
│   ├── contact-profile.tsx           # (exists, adapt for Contact type)
│   ├── conversation-status-badge.tsx # NEW: status badge component
│   ├── typing-indicator.tsx          # NEW: typing indicator
│   └── whatsapp-status.tsx           # NEW: channel connection status
├── hooks/
│   ├── use-socket.ts                 # NEW: Socket.IO connection + events
│   ├── use-conversations.ts          # NEW: React Query + Socket.IO
│   └── use-messages.ts               # NEW: React Query + Socket.IO
├── lib/
│   ├── socket-client.ts              # NEW: Socket.IO client singleton
│   └── constants.ts                  # NEW: chat-specific constants
├── types/
│   └── index.ts                      # NEW: domain-aligned types
└── data/
    └── mock-data.ts                  # (exists, remove after integration)

apps/web/src/app/(dashboard)/chat/
└── page.tsx                          # NEW: chat page
```

---

## Task 1: Mongoose Models (@repo/db-chat)

**Files:**

- Create: `packages/db-chat/src/models/channel.model.ts`
- Create: `packages/db-chat/src/models/conversation.model.ts`
- Create: `packages/db-chat/src/models/message.model.ts`
- Create: `packages/db-chat/src/models/contact.model.ts`
- Create: `packages/db-chat/src/models/unread-count.model.ts`
- Create: `packages/db-chat/src/models/baileys-auth-state.model.ts`
- Create: `packages/db-chat/src/models/ai-agent.model.ts`
- Modify: `packages/db-chat/src/index.ts`

**Ref:** `docs/CHAT-SPEC.md` Sec 12 (indexes), Sec 1 (status enum), Sec 3 (channel types)

- [ ] **Step 1: Create Channel model**

```ts
// packages/db-chat/src/models/channel.model.ts
import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const CHANNEL_TYPES = ['WHATSAPP', 'WEB'] as const
const BROKER_TYPES = ['BAILEYS', 'META'] as const
const CHANNEL_STATUSES = ['CONNECTED', 'DISCONNECTED', 'QR_PENDING'] as const

const channelSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: CHANNEL_TYPES, required: true },
    brokerType: { type: String, enum: BROKER_TYPES, default: 'BAILEYS' },
    phoneNumber: String,
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: CHANNEL_STATUSES, default: 'DISCONNECTED' },
    lastConnectedAt: Date,
    aiUserId: String, // if set, new conversations start as BOT_ACTIVE
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

channelSchema.index({ tenantId: 1, type: 1 })

export type ChannelDocument = InferSchemaType<typeof channelSchema> & {
  _id: string
}
export const Channel = mongoose.model('Channel', channelSchema)
```

- [ ] **Step 2: Create Conversation model**

```ts
// packages/db-chat/src/models/conversation.model.ts
import mongoose, { type InferSchemaType, Schema } from 'mongoose'

export const CONVERSATION_STATUSES = [
  'BOT_ACTIVE',
  'WAITING_HUMAN',
  'HUMAN_ACTIVE',
  'CLOSED',
] as const

const conversationSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    channelId: { type: String, required: true },
    contactId: { type: String, required: true },
    status: {
      type: String,
      enum: CONVERSATION_STATUSES,
      default: 'BOT_ACTIVE',
    },
    assignedTo: String,
    assignedToName: String,
    subject: String,
    lastMessageText: String,
    lastMessageAt: Date,
    whatsappPhone: String,
    closedAt: Date,
    closedBy: String,
  },
  { timestamps: true }
)

conversationSchema.index({ tenantId: 1, status: 1 })
conversationSchema.index({ tenantId: 1, contactId: 1, channelId: 1, status: 1 })
conversationSchema.index({ tenantId: 1, updatedAt: -1 })

export type ConversationDocument = InferSchemaType<
  typeof conversationSchema
> & { _id: string }
export const Conversation = mongoose.model('Conversation', conversationSchema)
```

Note: unique index changed to `(tenantId, contactId, channelId, status)` — same contact+channel can have multiple conversations (closed ones), uniqueness is per-open-conversation enforced at app level via `findOneAndUpdate`.

- [ ] **Step 3: Create Message model (with TTL)**

```ts
// packages/db-chat/src/models/message.model.ts
import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const SENDER_TYPES = ['CLIENT', 'AGENT', 'BOT', 'SYSTEM'] as const
const MESSAGE_TYPES = [
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'DOCUMENT',
  'OTHER',
] as const
const MESSAGE_STATUSES = [
  'PENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
] as const

const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true },
    senderType: { type: String, enum: SENDER_TYPES, required: true },
    senderName: String,
    senderId: String,
    text: String,
    type: { type: String, enum: MESSAGE_TYPES, default: 'TEXT' },
    mediaUrl: String,
    mediaKey: String,
    status: { type: String, enum: MESSAGE_STATUSES, default: 'PENDING' },
    metadata: Schema.Types.Mixed,
    externalId: String, // WhatsApp message ID for dedup
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

messageSchema.index(
  { tenantId: 1, createdAt: 1 },
  { expireAfterSeconds: 730 * 24 * 60 * 60 }
) // 730 days TTL
messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ externalId: 1 }, { sparse: true }) // dedup index

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: string
}
export const Message = mongoose.model('Message', messageSchema)
```

- [ ] **Step 4: Create Contact model**

```ts
// packages/db-chat/src/models/contact.model.ts
import mongoose, { type InferSchemaType, Schema } from 'mongoose'

const contactSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    whatsappPhone: { type: String, required: true },
    pushName: String, // name from WhatsApp
    profilePicUrl: String,
    clientId: String, // link to PostgreSQL Client (future: lead capture)
  },
  { timestamps: true }
)

contactSchema.index({ tenantId: 1, whatsappPhone: 1 }, { unique: true })

export type ContactDocument = InferSchemaType<typeof contactSchema> & {
  _id: string
}
export const Contact = mongoose.model('Contact', contactSchema)
```

- [ ] **Step 5: Create UnreadCount, BaileysAuthState, AiAgent models**

```ts
// packages/db-chat/src/models/unread-count.model.ts
import mongoose, { Schema } from 'mongoose'

const unreadCountSchema = new Schema({
  tenantId: { type: String, required: true },
  conversationId: { type: String, required: true },
  userId: { type: String, required: true },
  count: { type: Number, default: 0 },
  lastReadAt: Date,
})

unreadCountSchema.index(
  { tenantId: 1, conversationId: 1, userId: 1 },
  { unique: true }
)

export const UnreadCount = mongoose.model('UnreadCount', unreadCountSchema)
```

```ts
// packages/db-chat/src/models/baileys-auth-state.model.ts
import mongoose, { Schema } from 'mongoose'

const baileysAuthStateSchema = new Schema({
  tenantId: { type: String, required: true },
  channelId: { type: String, required: true },
  key: { type: String, required: true },
  value: Schema.Types.Mixed,
})

baileysAuthStateSchema.index(
  { tenantId: 1, channelId: 1, key: 1 },
  { unique: true }
)

export const BaileysAuthState = mongoose.model(
  'BaileysAuthState',
  baileysAuthStateSchema
)
```

```ts
// packages/db-chat/src/models/ai-agent.model.ts
import mongoose, { Schema } from 'mongoose'

// Stub: config model for future AI bot (Fase 6)
const aiAgentSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    channelId: { type: String, required: true },
    systemPrompt: {
      type: String,
      default:
        'Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro.',
    },
    provider: { type: String, enum: ['claude', 'openai'], default: 'claude' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 500 },
    maxResponsesPerConversation: { type: Number, default: 20 },
    isActive: { type: Boolean, default: false }, // stub: always false
  },
  { timestamps: true }
)

aiAgentSchema.index({ tenantId: 1, channelId: 1 }, { unique: true })

export const AiAgent = mongoose.model('AiAgent', aiAgentSchema)
```

- [ ] **Step 6: Export all from index.ts**

```ts
// packages/db-chat/src/index.ts
export { connectMongoDB, disconnectMongoDB } from './connection.js'

export { Channel, type ChannelDocument } from './models/channel.model.js'
export {
  Conversation,
  CONVERSATION_STATUSES,
  type ConversationDocument,
} from './models/conversation.model.js'
export { Message, type MessageDocument } from './models/message.model.js'
export { Contact, type ContactDocument } from './models/contact.model.js'
export { UnreadCount } from './models/unread-count.model.js'
export { BaileysAuthState } from './models/baileys-auth-state.model.js'
export { AiAgent } from './models/ai-agent.model.js'
```

- [ ] **Step 7: Commit**

```bash
git add packages/db-chat/
git commit -m "feat(chat): add mongoose models (channel, conversation, message, contact, unread, auth-state)"
```

---

## Task 2: Update @repo/shared (Socket Events + Constants)

**Files:**

- Modify: `packages/shared/src/socket-events.ts`
- Create: `packages/shared/src/chat-constants.ts`
- Modify: `packages/shared/src/index.ts`

**Ref:** `docs/CHAT-SPEC.md` Sec 9 (Socket.IO events), Sec 11 (BullMQ queues)

- [ ] **Step 1: Update SOCKET_EVENTS with all chat events**

Replace `packages/shared/src/socket-events.ts` to align with CHAT-SPEC Section 9:

```ts
export const SOCKET_EVENTS = {
  // Chat messages
  INCOMING_MESSAGE: 'chat:incoming-message',
  MESSAGE_STATUS: 'chat:message-status',
  SEND_MESSAGE: 'chat:send-message',

  // Conversations
  SUBSCRIBE_CONVERSATION: 'chat:subscribe-conversation',
  UNSUBSCRIBE_CONVERSATION: 'chat:unsubscribe-conversation',
  ASSIGN_CONVERSATION: 'chat:assign-conversation',
  CLOSE_CONVERSATION: 'chat:close-conversation',
  TRANSFER_CONVERSATION: 'chat:transfer-conversation',
  CONVERSATION_UPDATED: 'chat:conversation-updated',

  // Unread
  UNREAD_UPDATE: 'chat:unread-update',

  // Presence
  AGENT_HEARTBEAT: 'agent:heartbeat',
  AGENT_STATUS_UPDATE: 'agent:status-update',

  // Typing
  TYPING_START: 'conversation:typing-start',
  TYPING: 'conversation:typing',

  // Channel
  CHANNEL_STATUS: 'channel:status',

  // Catch-up
  CATCH_UP: 'chat:catch-up',

  // Notifications (Fase 6)
  NOTIFICATION: 'notification',
} as const

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
```

- [ ] **Step 2: Create chat constants**

```ts
// packages/shared/src/chat-constants.ts
export const CHAT_QUEUES = {
  SEND_MESSAGE: 'chat-send-message',
  PROCESS_INCOMING: 'chat-process-incoming',
  AI_BOT: 'chat-ai-bot',
  AUTO_CLOSE: 'chat-auto-close',
  DEAD_LETTER: 'chat-dead-letter',
} as const

export const CHAT_LIMITS = {
  MAX_CONVERSATIONS_PER_ORG: 50,
  MAX_BAILEYS_CHANNELS_PER_ORG: 10,
  MAX_SOCKET_CONNECTIONS_PER_ORG: 100,
  MAX_MESSAGES_DISPLAY: 1000,
  CONVERSATIONS_PER_PAGE: 50,
  MESSAGES_PER_PAGE: 50,
  CATCH_UP_MAX_MESSAGES: 100,
  AUTO_CLOSE_HOURS: 24,
  HEARTBEAT_INTERVAL_MS: 30_000,
  HEARTBEAT_TIMEOUT_MS: 120_000,
  TYPING_DEBOUNCE_MS: 2_000,
  TYPING_TIMEOUT_MS: 5_000,
  UNASSIGNED_NOTIFY_TIMEOUT_MS: 300_000, // 5 min
  MAX_AI_RESPONSES_PER_CONVERSATION: 20,
} as const

export const CHAT_PUBSUB_CHANNELS = {
  INCOMING_MESSAGE: 'chat:pub:incoming-message',
  MESSAGE_STATUS: 'chat:pub:message-status',
  CHANNEL_STATUS: 'chat:pub:channel-status',
  CONVERSATION_UPDATE: 'chat:pub:conversation-update',
  UNREAD_UPDATE: 'chat:pub:unread-update',
} as const
```

- [ ] **Step 3: Update shared index.ts exports**

Add to `packages/shared/src/index.ts`:

```ts
export {
  CHAT_QUEUES,
  CHAT_LIMITS,
  CHAT_PUBSUB_CHANNELS,
} from './chat-constants.js'
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat(chat): update socket events and add chat constants (queues, limits, pubsub)"
```

---

## Task 3: Chat Domain - Conversation Entity (TDD)

**Files:**

- Create: `apps/chat-server/src/domain/types.ts`
- Create: `apps/chat-server/src/domain/errors.ts`
- Create: `apps/chat-server/src/domain/ports/conversation-repository.ts`
- Create: `apps/chat-server/src/domain/ports/message-repository.ts`
- Create: `apps/chat-server/src/domain/ports/contact-repository.ts`
- Create: `apps/chat-server/src/domain/conversation.ts`
- Create: `apps/chat-server/src/domain/conversation.spec.ts`

**Ref:** `docs/CHAT-SPEC.md` Sec 1 (state machine), Sec 2 (assignment). Follow DDD pattern from `packages/core/src/modules/commission/domain/commission.ts`.

- [ ] **Step 1: Create domain types**

```ts
// apps/chat-server/src/domain/types.ts
export type ConversationStatus =
  | 'BOT_ACTIVE'
  | 'WAITING_HUMAN'
  | 'HUMAN_ACTIVE'
  | 'CLOSED'
export type SenderType = 'CLIENT' | 'AGENT' | 'BOT' | 'SYSTEM'
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'OTHER'
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type ChannelType = 'WHATSAPP' | 'WEB'
export type BrokerType = 'BAILEYS' | 'META'
export type ChannelStatus = 'CONNECTED' | 'DISCONNECTED' | 'QR_PENDING'

export interface ConversationData {
  readonly id: string
  readonly tenantId: string
  readonly channelId: string
  readonly contactId: string
  readonly status: ConversationStatus
  readonly assignedTo: string | null
  readonly assignedToName: string | null
  readonly subject: string | null
  readonly lastMessageText: string | null
  readonly lastMessageAt: Date | null
  readonly whatsappPhone: string | null
  readonly closedAt: Date | null
  readonly closedBy: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface MessageData {
  readonly id: string
  readonly conversationId: string
  readonly tenantId: string
  readonly senderType: SenderType
  readonly senderName: string | null
  readonly senderId: string | null
  readonly text: string | null
  readonly type: MessageType
  readonly mediaUrl: string | null
  readonly mediaKey: string | null
  readonly status: MessageStatus
  readonly metadata: Record<string, unknown> | null
  readonly externalId: string | null
  readonly createdAt: Date
}

export interface ContactData {
  readonly id: string
  readonly tenantId: string
  readonly whatsappPhone: string
  readonly pushName: string | null
  readonly profilePicUrl: string | null
  readonly clientId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface ChannelData {
  readonly id: string
  readonly tenantId: string
  readonly name: string
  readonly type: ChannelType
  readonly brokerType: BrokerType
  readonly phoneNumber: string | null
  readonly isActive: boolean
  readonly status: ChannelStatus
  readonly lastConnectedAt: Date | null
  readonly aiUserId: string | null
  readonly config: Record<string, unknown>
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface CursorPage {
  readonly cursor?: string
  readonly limit: number
}

export interface Page<TData> {
  readonly data: TData[]
  readonly meta: {
    readonly total: number
    readonly nextCursor: string | null
  }
}

export interface ConversationFilters {
  readonly tenantId: string
  readonly status?: ConversationStatus
  readonly assignedTo?: string
  readonly search?: string
}
```

- [ ] **Step 2: Create domain errors**

```ts
// apps/chat-server/src/domain/errors.ts
export class ConversationNotFoundError extends Error {
  readonly code = 'CONVERSATION_NOT_FOUND' as const
  constructor(id: string) {
    super(`Conversa ${id} nao encontrada`)
    this.name = 'ConversationNotFoundError'
  }
}

export class InvalidConversationTransitionError extends Error {
  readonly code = 'INVALID_CONVERSATION_TRANSITION' as const
  constructor(from: string, action: string) {
    super(`Nao e possivel ${action} a partir do status ${from}`)
    this.name = 'InvalidConversationTransitionError'
  }
}

export class ConversationAlreadyAssignedError extends Error {
  readonly code = 'CONVERSATION_ALREADY_ASSIGNED' as const
  constructor() {
    super('Conversa ja esta atribuida a outro agente')
    this.name = 'ConversationAlreadyAssignedError'
  }
}

export class ContactNotFoundError extends Error {
  readonly code = 'CONTACT_NOT_FOUND' as const
  constructor(id: string) {
    super(`Contato ${id} nao encontrado`)
    this.name = 'ContactNotFoundError'
  }
}

export class ChannelNotFoundError extends Error {
  readonly code = 'CHANNEL_NOT_FOUND' as const
  constructor(id: string) {
    super(`Canal ${id} nao encontrado`)
    this.name = 'ChannelNotFoundError'
  }
}

export const ChatErrors = {
  conversationNotFound: (id: string) => new ConversationNotFoundError(id),
  invalidTransition: (from: string, action: string) =>
    new InvalidConversationTransitionError(from, action),
  alreadyAssigned: () => new ConversationAlreadyAssignedError(),
  contactNotFound: (id: string) => new ContactNotFoundError(id),
  channelNotFound: (id: string) => new ChannelNotFoundError(id),
}
```

- [ ] **Step 3: Create repository ports**

```ts
// apps/chat-server/src/domain/ports/conversation-repository.ts
import type {
  ConversationData,
  ConversationFilters,
  ConversationStatus,
  CursorPage,
  Page,
} from '../types.js'

export interface ConversationRepository {
  findById(id: string, tenantId: string): Promise<ConversationData | null>
  findOpenByContactAndChannel(
    tenantId: string,
    contactId: string,
    channelId: string
  ): Promise<ConversationData | null>
  findMany(
    filters: ConversationFilters,
    page: CursorPage
  ): Promise<Page<ConversationData>>
  create(
    data: Omit<ConversationData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ConversationData>
  updateStatus(
    id: string,
    tenantId: string,
    status: ConversationStatus,
    fields?: Partial<ConversationData>
  ): Promise<ConversationData | null>
  atomicAssign(
    id: string,
    tenantId: string,
    agentId: string,
    agentName: string
  ): Promise<ConversationData | null>
  updateLastMessage(
    id: string,
    tenantId: string,
    text: string,
    timestamp: Date
  ): Promise<void>
  findStaleConversations(
    olderThan: Date,
    limit: number
  ): Promise<ConversationData[]> // cross-tenant by design: system auto-close job
}
```

```ts
// apps/chat-server/src/domain/ports/message-repository.ts
import type { CursorPage, MessageData, MessageStatus, Page } from '../types.js'

export interface MessageRepository {
  create(data: Omit<MessageData, 'id' | 'createdAt'>): Promise<MessageData>
  findByConversation(
    conversationId: string,
    page: CursorPage
  ): Promise<Page<MessageData>>
  findByExternalId(externalId: string): Promise<MessageData | null>
  updateStatus(id: string, status: MessageStatus): Promise<void>
  findAfterTimestamp(
    conversationIds: string[],
    after: Date,
    limit: number
  ): Promise<MessageData[]>
}
```

```ts
// apps/chat-server/src/domain/ports/contact-repository.ts
import type { ContactData } from '../types.js'

export interface ContactRepository {
  findById(id: string, tenantId: string): Promise<ContactData | null>
  findByPhone(
    tenantId: string,
    whatsappPhone: string
  ): Promise<ContactData | null>
  upsertByPhone(
    tenantId: string,
    whatsappPhone: string,
    pushName?: string,
    profilePicUrl?: string
  ): Promise<ContactData>
}
```

- [ ] **Step 4: Write failing tests for Conversation entity**

```ts
// apps/chat-server/src/domain/conversation.spec.ts
import { describe, expect, it } from 'vitest'
import { ConversationEntity } from './conversation.js'
import {
  InvalidConversationTransitionError,
  ConversationAlreadyAssignedError,
} from './errors.js'

function makeConversation(
  overrides: Partial<Parameters<typeof ConversationEntity.restore>[0]> = {}
) {
  return ConversationEntity.restore({
    id: 'conv-1',
    tenantId: 'tenant-1',
    channelId: 'channel-1',
    contactId: 'contact-1',
    status: 'WAITING_HUMAN',
    assignedTo: null,
    assignedToName: null,
    ...overrides,
  })
}

describe('ConversationEntity', () => {
  describe('create', () => {
    it('creates with BOT_ACTIVE when channel has AI', () => {
      const conv = ConversationEntity.create({
        tenantId: 'tenant-1',
        channelId: 'channel-1',
        contactId: 'contact-1',
        whatsappPhone: '+5511999990000',
        hasAi: true,
      })
      expect(conv.status).toBe('BOT_ACTIVE')
    })

    it('creates with WAITING_HUMAN when channel has no AI', () => {
      const conv = ConversationEntity.create({
        tenantId: 'tenant-1',
        channelId: 'channel-1',
        contactId: 'contact-1',
        whatsappPhone: '+5511999990000',
        hasAi: false,
      })
      expect(conv.status).toBe('WAITING_HUMAN')
    })
  })

  describe('assign', () => {
    it('assigns agent to WAITING_HUMAN conversation', () => {
      const conv = makeConversation({
        status: 'WAITING_HUMAN',
        assignedTo: null,
      })
      conv.assign('agent-1', 'Maria')
      expect(conv.status).toBe('HUMAN_ACTIVE')
      expect(conv.assignedTo).toBe('agent-1')
      expect(conv.assignedToName).toBe('Maria')
    })

    it('rejects assign on HUMAN_ACTIVE (already assigned)', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-2',
      })
      expect(() => conv.assign('agent-1', 'Maria')).toThrow(
        ConversationAlreadyAssignedError
      )
    })

    it('rejects assign on CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.assign('agent-1', 'Maria')).toThrow(
        InvalidConversationTransitionError
      )
    })
  })

  describe('transfer', () => {
    it('transfers from HUMAN_ACTIVE to another agent', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
      })
      conv.transfer('agent-2', 'Joao')
      expect(conv.status).toBe('HUMAN_ACTIVE')
      expect(conv.assignedTo).toBe('agent-2')
      expect(conv.assignedToName).toBe('Joao')
    })

    it('rejects transfer from WAITING_HUMAN', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      expect(() => conv.transfer('agent-2', 'Joao')).toThrow(
        InvalidConversationTransitionError
      )
    })
  })

  describe('returnToQueue', () => {
    it('returns HUMAN_ACTIVE to WAITING_HUMAN', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
      })
      conv.returnToQueue()
      expect(conv.status).toBe('WAITING_HUMAN')
      expect(conv.assignedTo).toBeNull()
      expect(conv.assignedToName).toBeNull()
    })

    it('rejects from CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.returnToQueue()).toThrow(
        InvalidConversationTransitionError
      )
    })
  })

  describe('close', () => {
    it('closes HUMAN_ACTIVE conversation', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
      })
      conv.close('agent-1')
      expect(conv.status).toBe('CLOSED')
      expect(conv.closedBy).toBe('agent-1')
    })

    it('closes BOT_ACTIVE conversation (auto-close)', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      conv.close('system')
      expect(conv.status).toBe('CLOSED')
    })

    it('closes WAITING_HUMAN conversation (auto-close)', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      conv.close('system')
      expect(conv.status).toBe('CLOSED')
    })

    it('rejects close on already CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.close('agent-1')).toThrow(
        InvalidConversationTransitionError
      )
    })
  })

  describe('escalateToHuman', () => {
    it('escalates from BOT_ACTIVE to WAITING_HUMAN', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      conv.escalateToHuman()
      expect(conv.status).toBe('WAITING_HUMAN')
    })

    it('rejects escalate from HUMAN_ACTIVE', () => {
      const conv = makeConversation({ status: 'HUMAN_ACTIVE' })
      expect(() => conv.escalateToHuman()).toThrow(
        InvalidConversationTransitionError
      )
    })
  })
})
```

- [ ] **Step 5: Run tests, verify they fail**

```bash
cd apps/chat-server && pnpm vitest run src/domain/conversation.spec.ts
```

Expected: FAIL — `ConversationEntity` not found.

Note: if vitest is not configured for chat-server, create `vitest.config.ts` following `packages/core/vitest.config.ts` pattern.

- [ ] **Step 6: Implement Conversation entity**

```ts
// apps/chat-server/src/domain/conversation.ts
import {
  ConversationAlreadyAssignedError,
  InvalidConversationTransitionError,
} from './errors.js'
import type { ConversationStatus } from './types.js'

interface ConversationProps {
  readonly id: string
  readonly tenantId: string
  readonly channelId: string
  readonly contactId: string
  status: ConversationStatus
  assignedTo: string | null
  assignedToName: string | null
  whatsappPhone?: string | null
  closedAt?: Date | null
  closedBy?: string | null
}

interface CreateInput {
  tenantId: string
  channelId: string
  contactId: string
  whatsappPhone: string
  hasAi: boolean
}

export class ConversationEntity {
  private props: ConversationProps

  private constructor(props: ConversationProps) {
    this.props = props
  }

  static create(input: CreateInput): ConversationEntity {
    return new ConversationEntity({
      id: '',
      tenantId: input.tenantId,
      channelId: input.channelId,
      contactId: input.contactId,
      status: input.hasAi ? 'BOT_ACTIVE' : 'WAITING_HUMAN',
      assignedTo: null,
      assignedToName: null,
      whatsappPhone: input.whatsappPhone,
      closedAt: null,
      closedBy: null,
    })
  }

  static restore(props: ConversationProps): ConversationEntity {
    return new ConversationEntity(props)
  }

  get id(): string {
    return this.props.id
  }
  get tenantId(): string {
    return this.props.tenantId
  }
  get channelId(): string {
    return this.props.channelId
  }
  get contactId(): string {
    return this.props.contactId
  }
  get status(): ConversationStatus {
    return this.props.status
  }
  get assignedTo(): string | null {
    return this.props.assignedTo
  }
  get assignedToName(): string | null {
    return this.props.assignedToName
  }
  get closedBy(): string | null {
    return this.props.closedBy ?? null
  }

  assign(agentId: string, agentName: string): void {
    if (this.props.status !== 'WAITING_HUMAN') {
      if (this.props.status === 'HUMAN_ACTIVE') {
        throw new ConversationAlreadyAssignedError()
      }
      throw new InvalidConversationTransitionError(this.props.status, 'assumir')
    }
    this.props.status = 'HUMAN_ACTIVE'
    this.props.assignedTo = agentId
    this.props.assignedToName = agentName
  }

  transfer(agentId: string, agentName: string): void {
    if (this.props.status !== 'HUMAN_ACTIVE') {
      throw new InvalidConversationTransitionError(
        this.props.status,
        'transferir'
      )
    }
    this.props.assignedTo = agentId
    this.props.assignedToName = agentName
  }

  returnToQueue(): void {
    if (this.props.status !== 'HUMAN_ACTIVE') {
      throw new InvalidConversationTransitionError(
        this.props.status,
        'devolver para fila'
      )
    }
    this.props.status = 'WAITING_HUMAN'
    this.props.assignedTo = null
    this.props.assignedToName = null
  }

  close(closedBy: string): void {
    if (this.props.status === 'CLOSED') {
      throw new InvalidConversationTransitionError(
        this.props.status,
        'finalizar'
      )
    }
    this.props.status = 'CLOSED'
    this.props.closedAt = new Date()
    this.props.closedBy = closedBy
  }

  escalateToHuman(): void {
    if (this.props.status !== 'BOT_ACTIVE') {
      throw new InvalidConversationTransitionError(
        this.props.status,
        'escalar para humano'
      )
    }
    this.props.status = 'WAITING_HUMAN'
  }

  toJSON(): ConversationProps {
    return { ...this.props }
  }
}
```

- [ ] **Step 7: Run tests, verify they pass**

```bash
cd apps/chat-server && pnpm vitest run src/domain/conversation.spec.ts
```

Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add apps/chat-server/src/domain/
git commit -m "feat(chat): add conversation domain entity with state machine (TDD)"
```

---

## Task 4: Chat Use Cases

**Files:**

- Create: all files in `apps/chat-server/src/application/`

**Ref:** `docs/CHAT-SPEC.md` Sec 1-2. Follow use case pattern from `packages/core/src/modules/commission/application/`.

- [ ] **Step 1: Write failing test for SaveIncomingMessage**

```ts
// apps/chat-server/src/application/save-incoming-message.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { SaveIncomingMessage } from './save-incoming-message.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ContactRepository } from '../domain/ports/contact-repository.js'

function makeRepos() {
  const conversationRepo: ConversationRepository = {
    findById: vi.fn(),
    findOpenByContactAndChannel: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    atomicAssign: vi.fn(),
    updateLastMessage: vi.fn(),
    findStaleConversations: vi.fn(),
  }
  const messageRepo: MessageRepository = {
    create: vi.fn(),
    findByConversation: vi.fn(),
    findByExternalId: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn(),
    findAfterTimestamp: vi.fn(),
  }
  const contactRepo: ContactRepository = {
    findById: vi.fn(),
    findByPhone: vi.fn(),
    upsertByPhone: vi.fn(),
  }
  return { conversationRepo, messageRepo, contactRepo }
}

describe('SaveIncomingMessage', () => {
  it('creates new conversation when none exists', async () => {
    const { conversationRepo, messageRepo, contactRepo } = makeRepos()
    const contact = {
      id: 'contact-1',
      tenantId: 't1',
      whatsappPhone: '+5511999990000',
      pushName: 'Carlos',
      profilePicUrl: null,
      clientId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const conversation = {
      id: 'conv-1',
      tenantId: 't1',
      channelId: 'ch-1',
      contactId: 'contact-1',
      status: 'WAITING_HUMAN' as const,
      assignedTo: null,
      assignedToName: null,
      subject: null,
      lastMessageText: 'Oi',
      lastMessageAt: new Date(),
      whatsappPhone: '+5511999990000',
      closedAt: null,
      closedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const message = {
      id: 'msg-1',
      conversationId: 'conv-1',
      tenantId: 't1',
      senderType: 'CLIENT' as const,
      senderName: 'Carlos',
      senderId: null,
      text: 'Oi',
      type: 'TEXT' as const,
      mediaUrl: null,
      mediaKey: null,
      status: 'DELIVERED' as const,
      metadata: null,
      externalId: 'wa-123',
      createdAt: new Date(),
    }

    vi.mocked(contactRepo.upsertByPhone).mockResolvedValue(contact)
    vi.mocked(conversationRepo.findOpenByContactAndChannel).mockResolvedValue(
      null
    )
    vi.mocked(conversationRepo.create).mockResolvedValue(conversation)
    vi.mocked(messageRepo.create).mockResolvedValue(message)

    const useCase = new SaveIncomingMessage(
      conversationRepo,
      messageRepo,
      contactRepo
    )
    const result = await useCase.execute({
      tenantId: 't1',
      channelId: 'ch-1',
      whatsappPhone: '+5511999990000',
      pushName: 'Carlos',
      text: 'Oi',
      externalId: 'wa-123',
      hasAi: false,
    })

    expect(conversationRepo.create).toHaveBeenCalled()
    expect(messageRepo.create).toHaveBeenCalled()
    expect(result.message.text).toBe('Oi')
  })

  it('deduplicates by externalId', async () => {
    const { conversationRepo, messageRepo, contactRepo } = makeRepos()
    const existingMsg = {
      id: 'msg-1',
      conversationId: 'conv-1',
      tenantId: 't1',
      senderType: 'CLIENT' as const,
      senderName: 'Carlos',
      senderId: null,
      text: 'Oi',
      type: 'TEXT' as const,
      mediaUrl: null,
      mediaKey: null,
      status: 'DELIVERED' as const,
      metadata: null,
      externalId: 'wa-123',
      createdAt: new Date(),
    }

    vi.mocked(messageRepo.findByExternalId).mockResolvedValue(existingMsg)

    const useCase = new SaveIncomingMessage(
      conversationRepo,
      messageRepo,
      contactRepo
    )
    const result = await useCase.execute({
      tenantId: 't1',
      channelId: 'ch-1',
      whatsappPhone: '+5511999990000',
      pushName: 'Carlos',
      text: 'Oi',
      externalId: 'wa-123',
      hasAi: false,
    })

    expect(messageRepo.create).not.toHaveBeenCalled()
    expect(result.message.id).toBe('msg-1')
    expect(result.isDuplicate).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd apps/chat-server && pnpm vitest run src/application/save-incoming-message.spec.ts
```

- [ ] **Step 3: Implement SaveIncomingMessage**

```ts
// apps/chat-server/src/application/save-incoming-message.ts
import 'reflect-metadata'
import { injectable, inject } from 'tsyringe'
import { ConversationEntity } from '../domain/conversation.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'
import type { ContactRepository } from '../domain/ports/contact-repository.js'
import type { MessageRepository } from '../domain/ports/message-repository.js'
import type { ConversationData, MessageData } from '../domain/types.js'

interface SaveIncomingInput {
  tenantId: string
  channelId: string
  whatsappPhone: string
  pushName?: string
  text?: string
  type?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER'
  mediaUrl?: string
  externalId?: string
  hasAi: boolean
}

interface SaveIncomingResult {
  conversation: ConversationData
  message: MessageData
  isNewConversation: boolean
  isDuplicate: boolean
}

@injectable()
export class SaveIncomingMessage {
  constructor(
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('MessageRepository')
    private readonly messageRepo: MessageRepository,
    @inject('ContactRepository') private readonly contactRepo: ContactRepository
  ) {}

  async execute(input: SaveIncomingInput): Promise<SaveIncomingResult> {
    // Dedup by externalId
    if (input.externalId) {
      const existing = await this.messageRepo.findByExternalId(input.externalId)
      if (existing) {
        const conversation = await this.conversationRepo.findById(
          existing.conversationId,
          input.tenantId
        )
        return {
          conversation: conversation!,
          message: existing,
          isNewConversation: false,
          isDuplicate: true,
        }
      }
    }

    // Upsert contact
    const contact = await this.contactRepo.upsertByPhone(
      input.tenantId,
      input.whatsappPhone,
      input.pushName
    )

    // Find or create conversation
    let isNewConversation = false
    let conversation = await this.conversationRepo.findOpenByContactAndChannel(
      input.tenantId,
      contact.id,
      input.channelId
    )

    if (!conversation) {
      const entity = ConversationEntity.create({
        tenantId: input.tenantId,
        channelId: input.channelId,
        contactId: contact.id,
        whatsappPhone: input.whatsappPhone,
        hasAi: input.hasAi,
      })
      conversation = await this.conversationRepo.create({
        ...entity.toJSON(),
        subject: null,
        lastMessageText: input.text ?? null,
        lastMessageAt: new Date(),
        closedAt: null,
        closedBy: null,
      })
      isNewConversation = true
    }

    // Save message
    const message = await this.messageRepo.create({
      conversationId: conversation.id,
      tenantId: input.tenantId,
      senderType: 'CLIENT',
      senderName: contact.pushName ?? input.whatsappPhone,
      senderId: null,
      text: input.text ?? null,
      type: input.type ?? 'TEXT',
      mediaUrl: input.mediaUrl ?? null,
      mediaKey: null,
      status: 'DELIVERED',
      metadata: null,
      externalId: input.externalId ?? null,
    })

    // Update conversation lastMessage
    await this.conversationRepo.updateLastMessage(
      conversation.id,
      input.text ?? '',
      new Date()
    )

    return { conversation, message, isNewConversation, isDuplicate: false }
  }
}
```

- [ ] **Step 4: Run tests, verify they pass**

- [ ] **Step 5: Write failing test for AssignConversation**

```ts
// apps/chat-server/src/application/assign-conversation.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { AssignConversation } from './assign-conversation.js'
import type { ConversationRepository } from '../domain/ports/conversation-repository.js'

describe('AssignConversation', () => {
  it('atomically assigns unassigned conversation', async () => {
    const repo: ConversationRepository = {
      findById: vi.fn(),
      findOpenByContactAndChannel: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      atomicAssign: vi.fn().mockResolvedValue({
        id: 'conv-1',
        tenantId: 't1',
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
        assignedToName: 'Maria',
        channelId: 'ch-1',
        contactId: 'c-1',
        subject: null,
        lastMessageText: null,
        lastMessageAt: null,
        whatsappPhone: null,
        closedAt: null,
        closedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateLastMessage: vi.fn(),
      findStaleConversations: vi.fn(),
    }

    const useCase = new AssignConversation(repo)
    const result = await useCase.execute({
      conversationId: 'conv-1',
      tenantId: 't1',
      agentId: 'agent-1',
      agentName: 'Maria',
    })

    expect(repo.atomicAssign).toHaveBeenCalledWith(
      'conv-1',
      't1',
      'agent-1',
      'Maria'
    )
    expect(result.status).toBe('HUMAN_ACTIVE')
  })

  it('throws when conversation already assigned (race condition)', async () => {
    const repo: ConversationRepository = {
      findById: vi.fn(),
      findOpenByContactAndChannel: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      atomicAssign: vi.fn().mockResolvedValue(null), // atomic failed
      updateLastMessage: vi.fn(),
      findStaleConversations: vi.fn(),
    }

    const useCase = new AssignConversation(repo)
    await expect(
      useCase.execute({
        conversationId: 'conv-1',
        tenantId: 't1',
        agentId: 'agent-1',
        agentName: 'Maria',
      })
    ).rejects.toThrow('Conversa ja esta atribuida')
  })
})
```

- [ ] **Step 6: Implement AssignConversation and remaining use cases**

Create these use cases following the same pattern (inject repos, execute method, domain validation):

- `assign-conversation.ts` — atomicAssign (MongoDB findOneAndUpdate with condition)
- `transfer-conversation.ts` — validates HUMAN_ACTIVE, updates assignedTo
- `return-to-queue.ts` — validates HUMAN_ACTIVE, sets WAITING_HUMAN + clears assignedTo
- `close-conversation.ts` — validates not CLOSED, sets CLOSED + closedAt + system message
- `send-message.ts` — creates message with status PENDING, enqueues to BullMQ
- `list-conversations.ts` — delegates to repo with filters + cursor pagination
- `get-conversation.ts` — finds by id + loads recent messages
- `mark-as-read.ts` — resets unread count for user + conversation

Each use case follows the pattern:

1. `@injectable()` class
2. Constructor with `@inject('RepositoryName')`
3. Single `execute()` method
4. Domain validation via entity or guard clauses
5. Returns data type (never entity)

- [ ] **Step 7: Run all use case tests**

```bash
cd apps/chat-server && pnpm vitest run src/application/
```

- [ ] **Step 8: Commit**

```bash
git add apps/chat-server/src/application/ apps/chat-server/src/domain/
git commit -m "feat(chat): add chat use cases (save message, send, assign, transfer, close, list, mark-read)"
```

---

## Task 5: Chat-Server Infrastructure

**Files:**

- Create: all files in `apps/chat-server/src/infra/`
- Modify: `apps/chat-server/src/app.ts`
- Modify: `apps/chat-server/src/index.ts`

**Ref:** Follow repository pattern from `packages/core/src/modules/commission/infrastructure/prisma-commission-repository.ts` adapted for Mongoose.

- [ ] **Step 1: Create Mongoose repository implementations**

`mongoose-conversation-repository.ts`:

- `findOpenByContactAndChannel`: query `{ tenantId, contactId, channelId, status: { $ne: 'CLOSED' } }`
- `atomicAssign`: `findOneAndUpdate({ _id: id, tenantId, status: 'WAITING_HUMAN', assignedTo: null }, { $set: { status: 'HUMAN_ACTIVE', assignedTo, assignedToName } })` — atomic, prevents race condition
- `findStaleConversations`: query `{ status: { $ne: 'CLOSED' }, updatedAt: { $lt: olderThan } }` for auto-close
- Cursor pagination: use `_id > cursor` pattern (not offset)

`mongoose-message-repository.ts`:

- `findByConversation`: query with cursor pagination, sort `createdAt: -1`
- `findByExternalId`: dedup lookup, uses sparse index

`mongoose-contact-repository.ts`:

- `upsertByPhone`: `findOneAndUpdate({ tenantId, whatsappPhone }, { $set: { pushName } }, { upsert: true, returnDocument: 'after' })`

- [ ] **Step 2: Create chat auth middleware**

```ts
// apps/chat-server/src/infra/http/middleware/chat-auth-middleware.ts
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '@repo/env'
import type { FastifyRequest, FastifyReply } from 'fastify'

const jwtPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  role: z.string(),
  name: z.string(),
})

export async function chatAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token nao fornecido' },
    })
  }

  try {
    const token = authHeader.slice(7)
    const decoded = jwt.verify(token, env.SOCKET_JWT_SECRET)
    const payload = jwtPayloadSchema.parse(decoded)
    request.user = payload
    request.organizationId = payload.organizationId
  } catch {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token invalido' },
    })
  }
}
```

Note: Chat-server uses its own JWT (SOCKET_JWT_SECRET) separate from Better Auth sessions. The main server issues this JWT when user authenticates (endpoint to add in main server: `POST /api/v1/chat/token`).

- [ ] **Step 3: Create Socket.IO auth + handler**

```ts
// apps/chat-server/src/infra/socket/socket-auth.ts
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '@repo/env'
import type { Socket } from 'socket.io'

const jwtPayloadSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  role: z.string(),
  name: z.string(),
})

export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const token =
    typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : undefined
  if (!token) return next(new Error('Token nao fornecido'))

  try {
    const decoded = jwt.verify(token, env.SOCKET_JWT_SECRET)
    const payload = jwtPayloadSchema.parse(decoded)
    socket.data.user = payload
    next()
  } catch {
    next(new Error('Token invalido'))
  }
}
```

```ts
// apps/chat-server/src/infra/socket/socket-handler.ts
import type { Server, Socket } from 'socket.io'
import { container } from 'tsyringe'
import { SOCKET_EVENTS, CHAT_LIMITS } from '@repo/shared'
import { SendMessage } from '../../application/send-message.js'
import { AssignConversation } from '../../application/assign-conversation.js'
import { CloseConversation } from '../../application/close-conversation.js'
import { TransferConversation } from '../../application/transfer-conversation.js'
import { MarkAsRead } from '../../application/mark-as-read.js'
import type { MessageRepository } from '../../domain/ports/message-repository.js'
import { socketAuth } from './socket-auth.js'
import pino from 'pino'

const logger = pino({ name: 'socket-handler' })

// Presence: Map<orgId, Map<userId, { name, lastHeartbeat }>>
const presenceMap = new Map<
  string,
  Map<string, { name: string; lastHeartbeat: number }>
>()

export function setupSocketHandlers(io: Server): void {
  io.use(socketAuth)

  // Stale agent check interval
  setInterval(() => {
    const now = Date.now()
    for (const [orgId, agents] of presenceMap) {
      for (const [userId, data] of agents) {
        if (now - data.lastHeartbeat > CHAT_LIMITS.HEARTBEAT_TIMEOUT_MS) {
          agents.delete(userId)
          io.to(`tenant:${orgId}:lobby`).emit(
            SOCKET_EVENTS.AGENT_STATUS_UPDATE,
            {
              userId,
              status: 'offline',
            }
          )
        }
      }
    }
  }, CHAT_LIMITS.HEARTBEAT_INTERVAL_MS)

  io.on('connection', (socket: Socket) => {
    const { userId, organizationId, name } = socket.data.user
    const orgRoom = `tenant:${organizationId}:lobby`
    socket.join(orgRoom)

    // Register presence
    if (!presenceMap.has(organizationId))
      presenceMap.set(organizationId, new Map())
    presenceMap
      .get(organizationId)!
      .set(userId, { name, lastHeartbeat: Date.now() })
    io.to(orgRoom).emit(SOCKET_EVENTS.AGENT_STATUS_UPDATE, {
      userId,
      status: 'online',
      name,
    })

    // --- Event handlers ---

    socket.on(
      SOCKET_EVENTS.SUBSCRIBE_CONVERSATION,
      (data: { conversationId: string }) => {
        socket.join(
          `tenant:${organizationId}:conversation:${data.conversationId}`
        )
      }
    )

    socket.on(
      SOCKET_EVENTS.UNSUBSCRIBE_CONVERSATION,
      (data: { conversationId: string }) => {
        socket.leave(
          `tenant:${organizationId}:conversation:${data.conversationId}`
        )
      }
    )

    socket.on(
      SOCKET_EVENTS.SEND_MESSAGE,
      async (data: { conversationId: string; text: string }) => {
        try {
          const useCase = container.resolve(SendMessage)
          await useCase.execute({
            conversationId: data.conversationId,
            tenantId: organizationId,
            senderId: userId,
            senderName: name,
            text: data.text,
          })
        } catch (err) {
          logger.error(
            { err, conversationId: data.conversationId },
            'Error sending message via socket'
          )
          socket.emit('error', { message: 'Erro ao enviar mensagem' })
        }
      }
    )

    socket.on(
      SOCKET_EVENTS.ASSIGN_CONVERSATION,
      async (data: { conversationId: string }) => {
        try {
          const useCase = container.resolve(AssignConversation)
          const result = await useCase.execute({
            conversationId: data.conversationId,
            tenantId: organizationId,
            agentId: userId,
            agentName: name,
          })
          io.to(orgRoom).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, result)
        } catch (err) {
          logger.error({ err }, 'Error assigning conversation')
          socket.emit('error', {
            message:
              err instanceof Error ? err.message : 'Erro ao assumir conversa',
          })
        }
      }
    )

    socket.on(
      SOCKET_EVENTS.CLOSE_CONVERSATION,
      async (data: { conversationId: string }) => {
        try {
          const useCase = container.resolve(CloseConversation)
          const result = await useCase.execute({
            conversationId: data.conversationId,
            tenantId: organizationId,
            closedBy: userId,
          })
          io.to(orgRoom).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, result)
        } catch (err) {
          logger.error({ err }, 'Error closing conversation')
          socket.emit('error', {
            message:
              err instanceof Error ? err.message : 'Erro ao fechar conversa',
          })
        }
      }
    )

    socket.on(
      SOCKET_EVENTS.TRANSFER_CONVERSATION,
      async (data: {
        conversationId: string
        toUserId: string
        toUserName: string
      }) => {
        try {
          const useCase = container.resolve(TransferConversation)
          const result = await useCase.execute({
            conversationId: data.conversationId,
            tenantId: organizationId,
            toUserId: data.toUserId,
            toUserName: data.toUserName,
          })
          io.to(orgRoom).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, result)
        } catch (err) {
          logger.error({ err }, 'Error transferring conversation')
          socket.emit('error', {
            message:
              err instanceof Error
                ? err.message
                : 'Erro ao transferir conversa',
          })
        }
      }
    )

    socket.on(
      SOCKET_EVENTS.TYPING_START,
      (data: { conversationId: string }) => {
        socket
          .to(`tenant:${organizationId}:conversation:${data.conversationId}`)
          .emit(SOCKET_EVENTS.TYPING, {
            conversationId: data.conversationId,
            userName: name,
          })
      }
    )

    socket.on(SOCKET_EVENTS.AGENT_HEARTBEAT, () => {
      const agents = presenceMap.get(organizationId)
      if (agents) agents.set(userId, { name, lastHeartbeat: Date.now() })
    })

    socket.on(
      SOCKET_EVENTS.CATCH_UP,
      async (data: {
        lastEventTimestamp: string
        conversationIds: string[]
      }) => {
        try {
          const messageRepo =
            container.resolve<MessageRepository>('MessageRepository')
          const messages = await messageRepo.findAfterTimestamp(
            data.conversationIds,
            new Date(data.lastEventTimestamp),
            CHAT_LIMITS.CATCH_UP_MAX_MESSAGES
          )
          socket.emit(SOCKET_EVENTS.CATCH_UP, { messages })
        } catch (err) {
          logger.error({ err }, 'Error during catch-up')
        }
      }
    )

    socket.on('disconnect', () => {
      const agents = presenceMap.get(organizationId)
      if (agents) agents.delete(userId)
      io.to(orgRoom).emit(SOCKET_EVENTS.AGENT_STATUS_UPDATE, {
        userId,
        status: 'offline',
      })
    })
  })
}
```

- [ ] **Step 4: Create Redis pub/sub publisher + subscriber**

Publisher publishes events from chat-worker → chat-server via Redis pub/sub:

- `INCOMING_MESSAGE`: new message received from WhatsApp
- `MESSAGE_STATUS`: message status update (sent/delivered/read/failed)
- `CHANNEL_STATUS`: Baileys connection status change
- `CONVERSATION_UPDATE`: conversation status change
- `UNREAD_UPDATE`: unread count change

Subscriber listens on these channels and broadcasts to appropriate Socket.IO rooms.

```ts
// apps/chat-server/src/infra/pubsub/redis-publisher.ts
import IORedis from 'ioredis'
import type { CHAT_PUBSUB_CHANNELS } from '@repo/shared'

export class RedisPublisher {
  constructor(private readonly redis: IORedis) {}

  async publish(
    channel: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(payload))
  }
}
```

```ts
// apps/chat-server/src/infra/pubsub/redis-subscriber.ts
import type IORedis from 'ioredis'
import type { Server } from 'socket.io'
import { CHAT_PUBSUB_CHANNELS, SOCKET_EVENTS } from '@repo/shared'
import pino from 'pino'

const logger = pino({ name: 'redis-subscriber' })

interface PubSubMessage {
  tenantId: string
  conversationId?: string
  userId?: string
  [key: string]: unknown
}

export class RedisSubscriber {
  constructor(
    private readonly redis: IORedis,
    private readonly io: Server
  ) {}

  async subscribe(): Promise<void> {
    await this.redis.subscribe(
      CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
      CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS,
      CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
      CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
      CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE
    )

    this.redis.on('message', (channel: string, rawMessage: string) => {
      try {
        const data = JSON.parse(rawMessage) as PubSubMessage
        this.handleMessage(channel, data)
      } catch (err) {
        logger.error({ err, channel }, 'Failed to parse pub/sub message')
      }
    })

    logger.info('Redis subscriber listening on chat pub/sub channels')
  }

  private handleMessage(channel: string, data: PubSubMessage): void {
    const { tenantId, conversationId } = data

    switch (channel) {
      case CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE:
        if (conversationId) {
          this.io
            .to(`tenant:${tenantId}:conversation:${conversationId}`)
            .emit(SOCKET_EVENTS.INCOMING_MESSAGE, data)
          this.io
            .to(`tenant:${tenantId}:lobby`)
            .emit(SOCKET_EVENTS.CONVERSATION_UPDATED, data)
        }
        break

      case CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS:
        if (conversationId) {
          this.io
            .to(`tenant:${tenantId}:conversation:${conversationId}`)
            .emit(SOCKET_EVENTS.MESSAGE_STATUS, data)
        }
        break

      case CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS:
        this.io
          .to(`tenant:${tenantId}:lobby`)
          .emit(SOCKET_EVENTS.CHANNEL_STATUS, data)
        break

      case CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE:
        this.io
          .to(`tenant:${tenantId}:lobby`)
          .emit(SOCKET_EVENTS.CONVERSATION_UPDATED, data)
        break

      case CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE:
        if (data.userId) {
          this.io
            .to(`tenant:${tenantId}:user:${data.userId}`)
            .emit(SOCKET_EVENTS.UNREAD_UPDATE, data)
        }
        break
    }
  }
}
```

- [ ] **Step 5: Create BullMQ queue definitions + producer**

```ts
// apps/chat-server/src/infra/queue/queue-names.ts
export { CHAT_QUEUES } from '@repo/shared'
```

```ts
// apps/chat-server/src/infra/queue/queue-producer.ts
import { Queue } from 'bullmq'
import type IORedis from 'ioredis'
import { CHAT_QUEUES } from '@repo/shared'

export class QueueProducer {
  private queues: Map<string, Queue>

  constructor(connection: IORedis) {
    this.queues = new Map([
      [
        CHAT_QUEUES.SEND_MESSAGE,
        new Queue(CHAT_QUEUES.SEND_MESSAGE, { connection }),
      ],
      [
        CHAT_QUEUES.PROCESS_INCOMING,
        new Queue(CHAT_QUEUES.PROCESS_INCOMING, { connection }),
      ],
      [CHAT_QUEUES.AI_BOT, new Queue(CHAT_QUEUES.AI_BOT, { connection })],
    ])
  }

  async enqueue(
    queueName: string,
    data: Record<string, unknown>,
    opts?: { delay?: number }
  ): Promise<void> {
    const queue = this.queues.get(queueName)
    if (!queue) throw new Error(`Queue ${queueName} not found`)
    await queue.add(queueName, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: false, // keep for DLQ inspection
      ...opts,
    })
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()))
  }
}
```

- [ ] **Step 6: Create DI registry**

```ts
// apps/chat-server/src/infra/di/registry.ts
import { container } from 'tsyringe'
import { MongooseConversationRepository } from '../repository/mongoose-conversation-repository.js'
import { MongooseMessageRepository } from '../repository/mongoose-message-repository.js'
import { MongooseContactRepository } from '../repository/mongoose-contact-repository.js'
import { SaveIncomingMessage } from '../../application/save-incoming-message.js'
import { SendMessage } from '../../application/send-message.js'
import { ListConversations } from '../../application/list-conversations.js'
import { GetConversation } from '../../application/get-conversation.js'
import { AssignConversation } from '../../application/assign-conversation.js'
import { TransferConversation } from '../../application/transfer-conversation.js'
import { ReturnToQueue } from '../../application/return-to-queue.js'
import { CloseConversation } from '../../application/close-conversation.js'
import { MarkAsRead } from '../../application/mark-as-read.js'
import type { QueueProducer } from '../queue/queue-producer.js'

export function registerDependencies(queueProducer: QueueProducer): void {
  // Repositories (singletons)
  const conversationRepo = new MongooseConversationRepository()
  const messageRepo = new MongooseMessageRepository()
  const contactRepo = new MongooseContactRepository()

  container.register('ConversationRepository', { useValue: conversationRepo })
  container.register('MessageRepository', { useValue: messageRepo })
  container.register('ContactRepository', { useValue: contactRepo })
  container.register('QueueProducer', { useValue: queueProducer })

  // Use cases (factories — resolve deps from container)
  container.register(SaveIncomingMessage, {
    useFactory: () =>
      new SaveIncomingMessage(conversationRepo, messageRepo, contactRepo),
  })
  container.register(SendMessage, {
    useFactory: () =>
      new SendMessage(conversationRepo, messageRepo, queueProducer),
  })
  container.register(ListConversations, {
    useFactory: () => new ListConversations(conversationRepo),
  })
  container.register(GetConversation, {
    useFactory: () =>
      new GetConversation(conversationRepo, messageRepo, contactRepo),
  })
  container.register(AssignConversation, {
    useFactory: () => new AssignConversation(conversationRepo),
  })
  container.register(TransferConversation, {
    useFactory: () => new TransferConversation(conversationRepo),
  })
  container.register(ReturnToQueue, {
    useFactory: () => new ReturnToQueue(conversationRepo),
  })
  container.register(CloseConversation, {
    useFactory: () => new CloseConversation(conversationRepo, messageRepo),
  })
  container.register(MarkAsRead, {
    useFactory: () => new MarkAsRead(),
  })
}
```

- [ ] **Step 7: Wire everything in app.ts and index.ts**

Update `apps/chat-server/src/index.ts`:

1. Import `reflect-metadata` (tsyringe requirement)
2. Call `connectMongoDB(env.MONGODB_URL)`
3. Initialize DI registry
4. Build app, start listening

Update `apps/chat-server/src/app.ts`:

1. Register `chatAuthMiddleware` on authenticated routes
2. Register conversation/channel/webhook routes
3. Setup Socket.IO handlers with `socketAuth`
4. Initialize Redis subscriber
5. Replace `console.error` with Pino logger

- [ ] **Step 8: Commit**

```bash
git add apps/chat-server/src/infra/ apps/chat-server/src/app.ts apps/chat-server/src/index.ts
git commit -m "feat(chat): add chat-server infra (mongoose repos, socket.io, redis pub/sub, bullmq, DI)"
```

---

## Task 6: Chat-Server HTTP Routes

**Files:**

- Create: `apps/chat-server/src/infra/http/routes/conversation-routes.ts`
- Create: `apps/chat-server/src/infra/http/routes/channel-routes.ts`
- Create: `apps/chat-server/src/infra/http/routes/webhook-routes.ts`

**Ref:** Follow route pattern from `apps/server/src/routes/v1/client-routes.ts`. Standardized response: `{ success: true, data, meta }`.

- [ ] **Step 1: Create conversation routes**

```
GET  /chat/conversations               - list (cursor pagination, status filter)
GET  /chat/conversations/:id            - get with recent messages
POST /chat/conversations/:id/assign     - assign to calling agent
POST /chat/conversations/:id/transfer   - transfer to another agent
POST /chat/conversations/:id/return     - return to queue
POST /chat/conversations/:id/close      - close conversation
POST /chat/conversations/:id/messages   - send message (HTTP alternative to socket)
POST /chat/conversations/:id/read       - mark as read
```

Each route: Zod schema for params/body/query → resolve use case from container → execute → handle domain errors → return standardized response.

- [ ] **Step 2: Create channel routes**

```
GET    /chat/channels       - list channels for org
POST   /chat/channels       - create channel
PUT    /chat/channels/:id   - update channel
DELETE /chat/channels/:id   - deactivate channel
```

- [ ] **Step 3: Create webhook routes**

```
GET  /chat/webhook/meta     - Meta verification challenge
POST /chat/webhook/meta     - Receive Meta events (HMAC-SHA256 signature validation)
```

Webhook route is unauthenticated (Meta calls it). Validate signature using `META_WHATSAPP_VERIFY_TOKEN`.

- [ ] **Step 4: Register routes in app.ts**

Wire all route modules in `buildChatApp()`:

- Authenticated scope (with `chatAuthMiddleware`): conversation + channel routes
- Unauthenticated scope: webhook routes + health check

- [ ] **Step 5: Commit**

```bash
git add apps/chat-server/src/infra/http/
git commit -m "feat(chat): add HTTP routes (conversations, channels, meta webhook)"
```

---

## Task 7: Chat-Worker - Broker Pattern + Baileys

**Files:**

- Create: all files in `apps/chat-worker/src/messaging/`
- Create: `apps/chat-worker/src/baileys/baileys-auth-store.ts`

**Ref:** `docs/CHAT-SPEC.md` Sec 3 (Brokers). Baileys auth MUST be MongoDB-backed (not file-based as in original plan).

- [ ] **Step 1: Create Broker interface**

```ts
// apps/chat-worker/src/messaging/broker.ts
export interface MessagePayload {
  to: string // phone number
  text?: string
  mediaUrl?: string
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'
}

export interface MessageResult {
  externalId: string
  status: 'SENT' | 'FAILED'
  errorCode?: string
}

export interface BrokerEvents {
  onMessage: (msg: IncomingMessage) => void
  onStatusUpdate: (update: StatusUpdate) => void
  onConnectionUpdate: (
    status: 'CONNECTED' | 'DISCONNECTED' | 'QR_PENDING',
    qr?: string
  ) => void
}

export interface IncomingMessage {
  from: string // phone number
  pushName?: string
  text?: string
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER'
  mediaUrl?: string
  externalId: string
  timestamp: Date
}

export interface StatusUpdate {
  externalId: string
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
}

export interface Broker {
  connect(events: BrokerEvents): Promise<void>
  disconnect(): Promise<void>
  sendMessage(payload: MessagePayload): Promise<MessageResult>
  isConnected(): boolean
}
```

- [ ] **Step 2: Create MongoDB-backed Baileys auth store**

```ts
// apps/chat-worker/src/baileys/baileys-auth-store.ts
import { BaileysAuthState } from '@repo/db-chat'
import type { AuthenticationState, SignalDataTypeMap } from 'baileys'
import { proto } from 'baileys'
import { initAuthCreds, BufferJSON } from 'baileys'

// MongoDB-backed auth state for Baileys.
// Replaces useMultiFileAuthState with useMongoDBAuthState.
// Stores creds + signal keys in BaileysAuthState collection per channelId.
// Pattern: get/set/delete operations on MongoDB documents.
export async function useMongoDBAuthState(channelId: string): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  // Read creds from MongoDB, or init new
  // Read/write signal keys from MongoDB
  // Return { state, saveCreds }
  // Implementation follows Baileys multi-file pattern but uses MongoDB instead of fs
}
```

- [ ] **Step 3: Implement BaileysBroker**

```ts
// apps/chat-worker/src/messaging/baileys-broker.ts
// Uses makeWASocket from baileys with MongoDB auth state.
// Listens to messages.upsert and connection.update events.
// On incoming message: calls events.onMessage callback.
// On connection change: calls events.onConnectionUpdate callback.
// sendMessage: formats jid as {phone}@s.whatsapp.net and sends via socket.
// Reconnection: automatic via Baileys built-in retry with saved creds.
```

- [ ] **Step 4: Implement MetaBroker**

```ts
// apps/chat-worker/src/messaging/meta-broker.ts
// Uses fetch to call Meta Graph API v21.0.
// sendMessage: POST to https://graph.facebook.com/v21.0/{phoneNumberId}/messages
// isConnected: always true (API-based).
// connect: no-op.
// disconnect: no-op.
```

- [ ] **Step 5: Create BrokerFactory and BaileysManager**

```ts
// apps/chat-worker/src/messaging/broker-factory.ts
// Creates Broker instance by type ('BAILEYS' | 'META').

// apps/chat-worker/src/messaging/baileys-manager.ts
// Manages Map<channelId, BaileysBroker>.
// On startup: loads active BAILEYS channels from MongoDB, connects each.
// Limit: max CHAT_LIMITS.MAX_BAILEYS_CHANNELS_PER_ORG per org.
// Exposes: getOrConnect(channelId), disconnect(channelId), getQrCode(channelId).
```

- [ ] **Step 6: Commit**

```bash
git add apps/chat-worker/src/messaging/ apps/chat-worker/src/baileys/
git commit -m "feat(chat): add broker pattern with baileys (MongoDB auth) and meta api"
```

---

## Task 8: Chat-Worker - Job Processors

**Files:**

- Create: all files in `apps/chat-worker/src/processors/`
- Modify: `apps/chat-worker/src/index.ts`

**Ref:** `docs/CHAT-SPEC.md` Sec 11 (BullMQ queues, retry, DLQ, error classification).

- [ ] **Step 1: Create send-message processor**

```ts
// apps/chat-worker/src/processors/send-message-processor.ts
import { UnrecoverableError, DelayedError, type Job } from 'bullmq'
import { Channel, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type IORedis from 'ioredis'
import type { BaileysManager } from '../messaging/baileys-manager.js'
import { MetaBroker } from '../messaging/meta-broker.js'
import pino from 'pino'

const logger = pino({ name: 'send-message-processor' })

const PERMANENT_ERROR_CODES = [
  'INVALID_NUMBER',
  'BLOCKED',
  'BANNED',
  'DEREGISTERED',
]

interface SendMessageJobData {
  messageId: string
  tenantId: string
  channelId: string
  to: string
  text?: string
  type: string
}

export function createSendMessageProcessor(
  redis: IORedis,
  baileysManager: BaileysManager
) {
  return async function processSendMessage(
    job: Job<SendMessageJobData>
  ): Promise<void> {
    const { messageId, tenantId, channelId, to, text, type } = job.data

    // 1. Load channel
    const channel = await Channel.findOne({ _id: channelId, tenantId }).lean()
    if (!channel) throw new UnrecoverableError(`Channel ${channelId} not found`)

    // 2. Get broker
    let result
    try {
      if (channel.brokerType === 'BAILEYS') {
        const broker = baileysManager.get(channelId)
        if (!broker?.isConnected()) throw new Error('Baileys not connected')
        result = await broker.sendMessage({
          to,
          text,
          type: type === 'TEXT' ? 'TEXT' : 'IMAGE',
        })
      } else {
        const metaBroker = new MetaBroker(channel.config)
        result = await metaBroker.sendMessage({
          to,
          text,
          type: type === 'TEXT' ? 'TEXT' : 'IMAGE',
        })
      }
    } catch (err) {
      const errorCode =
        err instanceof Error ? (err as { code?: string }).code : undefined

      // Permanent error — no retry
      if (errorCode && PERMANENT_ERROR_CODES.includes(errorCode)) {
        await Message.updateOne(
          { _id: messageId },
          { $set: { status: 'FAILED' } }
        )
        await redis.publish(
          CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS,
          JSON.stringify({
            tenantId,
            messageId,
            status: 'FAILED',
            errorCode,
          })
        )
        throw new UnrecoverableError(`Permanent error: ${errorCode}`)
      }

      // Rate limit — respect Retry-After
      if (errorCode === 'RATE_LIMITED') {
        const retryAfter = (err as { retryAfter?: number }).retryAfter ?? 60
        throw new DelayedError(`Rate limited, retry after ${retryAfter}s`)
      }

      // Transient — let BullMQ retry
      throw err
    }

    // 3. Update message status
    await Message.updateOne(
      { _id: messageId },
      { $set: { status: 'SENT', externalId: result.externalId } }
    )
    await redis.publish(
      CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS,
      JSON.stringify({
        tenantId,
        messageId,
        status: 'SENT',
        externalId: result.externalId,
      })
    )

    logger.info({ messageId, externalId: result.externalId }, 'Message sent')
  }
}
```

Concurrency: 5

- [ ] **Step 2: Create incoming-message processor**

```ts
// apps/chat-worker/src/processors/incoming-message-processor.ts
import type { Job } from 'bullmq'
import { Conversation, Contact, Message, UnreadCount } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES } from '@repo/shared'
import type IORedis from 'ioredis'
import type { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'incoming-message-processor' })

interface IncomingMessageJobData {
  tenantId: string
  channelId: string
  whatsappPhone: string
  pushName?: string
  text?: string
  type: string
  mediaUrl?: string
  externalId?: string
  hasAi: boolean
}

// Chat-worker handles persistence directly (not via chat-server use case)
// because the worker receives raw Baileys/Meta events and needs to persist
// before publishing to Redis. Chat-server only broadcasts via Socket.IO.
export function createIncomingMessageProcessor(redis: IORedis, aiQueue: Queue) {
  return async function processIncomingMessage(
    job: Job<IncomingMessageJobData>
  ): Promise<void> {
    const data = job.data

    // 1. Dedup by externalId
    if (data.externalId) {
      const existing = await Message.findOne({
        externalId: data.externalId,
      }).lean()
      if (existing) {
        logger.debug(
          { externalId: data.externalId },
          'Duplicate message, skipping'
        )
        return
      }
    }

    // 2. Upsert contact
    const contact = await Contact.findOneAndUpdate(
      { tenantId: data.tenantId, whatsappPhone: data.whatsappPhone },
      { $set: { pushName: data.pushName } },
      { upsert: true, returnDocument: 'after' }
    )

    // 3. Find or create conversation
    let conversation = await Conversation.findOne({
      tenantId: data.tenantId,
      contactId: contact!._id.toString(),
      channelId: data.channelId,
      status: { $ne: 'CLOSED' },
    })

    let isNewConversation = false
    if (!conversation) {
      conversation = await Conversation.create({
        tenantId: data.tenantId,
        channelId: data.channelId,
        contactId: contact!._id.toString(),
        status: data.hasAi ? 'BOT_ACTIVE' : 'WAITING_HUMAN',
        whatsappPhone: data.whatsappPhone,
      })
      isNewConversation = true
    }

    // 4. Save message
    const message = await Message.create({
      conversationId: conversation._id.toString(),
      tenantId: data.tenantId,
      senderType: 'CLIENT',
      senderName: data.pushName ?? data.whatsappPhone,
      text: data.text,
      type: data.type ?? 'TEXT',
      mediaUrl: data.mediaUrl,
      status: 'DELIVERED',
      externalId: data.externalId,
    })

    // 5. Update conversation lastMessage
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { lastMessageText: data.text, lastMessageAt: new Date() } }
    )

    // 6. Increment unread counts for all agents in org
    // (bulk upsert — handled by a separate UnreadCount update)
    await redis.publish(
      CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
      JSON.stringify({
        tenantId: data.tenantId,
        conversationId: conversation._id.toString(),
      })
    )

    // 7. Publish to chat-server for Socket.IO broadcast
    await redis.publish(
      CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
      JSON.stringify({
        tenantId: data.tenantId,
        conversationId: conversation._id.toString(),
        message: message.toObject(),
        isNewConversation,
        contact: contact!.toObject(),
      })
    )

    // 8. If BOT_ACTIVE, enqueue AI processing
    if (conversation.status === 'BOT_ACTIVE') {
      await aiQueue.add(CHAT_QUEUES.AI_BOT, {
        conversationId: conversation._id.toString(),
        tenantId: data.tenantId,
        messageText: data.text,
      })
    }

    logger.info(
      { conversationId: conversation._id, messageId: message._id },
      'Incoming message processed'
    )
  }
}
```

Concurrency: 3

- [ ] **Step 3: Create auto-close processor**

```ts
// apps/chat-worker/src/processors/auto-close-processor.ts
import type { Job } from 'bullmq'
import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_LIMITS } from '@repo/shared'
import type IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({ name: 'auto-close-processor' })

export function createAutoCloseProcessor(redis: IORedis) {
  return async function processAutoClose(_job: Job): Promise<void> {
    const cutoff = new Date(
      Date.now() - CHAT_LIMITS.AUTO_CLOSE_HOURS * 60 * 60 * 1000
    )

    const staleConversations = await Conversation.find({
      status: { $in: ['BOT_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE'] },
      updatedAt: { $lt: cutoff },
    })
      .limit(100)
      .lean()

    logger.info(
      { count: staleConversations.length },
      'Auto-closing stale conversations'
    )

    for (const conv of staleConversations) {
      await Conversation.updateOne(
        { _id: conv._id },
        { $set: { status: 'CLOSED', closedAt: new Date(), closedBy: 'system' } }
      )

      await Message.create({
        conversationId: conv._id.toString(),
        tenantId: conv.tenantId,
        senderType: 'SYSTEM',
        senderName: 'Sistema',
        text: 'Atendimento encerrado por inatividade',
        type: 'TEXT',
        status: 'DELIVERED',
      })

      await redis.publish(
        CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
        JSON.stringify({
          tenantId: conv.tenantId,
          conversationId: conv._id.toString(),
          status: 'CLOSED',
          closedBy: 'system',
        })
      )
    }
  }
}
```

Concurrency: 1 (repeatable: every 1 hour)

- [ ] **Step 4: Create AI bot processor (STUB)**

```ts
// apps/chat-worker/src/processors/ai-bot-processor.ts
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type { Job } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'ai-bot-processor' })

// STUB: Immediately escalates to WAITING_HUMAN.
// Real implementation comes in Fase 6 with @repo/ai (Vercel AI SDK).
export async function processAiBot(job: Job): Promise<void> {
  const { conversationId, tenantId } = job.data
  logger.info({ conversationId }, 'AI bot stub: escalating to human queue')

  // Update conversation status to WAITING_HUMAN
  // Create system message: "Transferido para um atendente. Aguarde."
  // Publish CONVERSATION_UPDATE via Redis pub/sub
}
```

- [ ] **Step 5: Wire processors in index.ts**

Update `apps/chat-worker/src/index.ts`:

1. Import `reflect-metadata`
2. Connect MongoDB
3. Initialize BaileysManager (loads active channels)
4. Create BullMQ Workers for each queue with correct concurrency
5. Setup auto-close repeatable job: `new Queue(CHAT_QUEUES.AUTO_CLOSE).add('auto-close', {}, { repeat: { pattern: '0 * * * *' } })`
6. Graceful shutdown: disconnect all brokers, close workers, close MongoDB
7. Replace `console.error` with Pino logger

- [ ] **Step 6: Commit**

```bash
git add apps/chat-worker/src/
git commit -m "feat(chat): add chat-worker processors (send, incoming, auto-close, ai-bot stub)"
```

---

## Task 9: Chat Token Endpoint (Main Server)

**Files:**

- Create: `apps/server/src/routes/v1/chat-token-route.ts`
- Modify: `apps/server/src/app.ts` (register route)

Chat-server uses its own JWT (SOCKET_JWT_SECRET). The main server issues this token for authenticated users.

- [ ] **Step 1: Create chat token endpoint**

```ts
// apps/server/src/routes/v1/chat-token-route.ts
import jwt from 'jsonwebtoken'
import { env } from '@repo/env'
import type { FastifyInstance } from 'fastify'

export async function chatTokenRoute(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/chat/token', async (request, reply) => {
    const { id: userId, name } = request.user
    const organizationId = request.organizationId
    const role = request.role

    const token = jwt.sign(
      { userId, organizationId, role, name },
      env.SOCKET_JWT_SECRET,
      {
        expiresIn: '24h',
      }
    )

    return reply.send({ success: true, data: { token } })
  })
}
```

- [ ] **Step 2: Register route in main server app.ts**

Add to authenticated routes in `apps/server/src/app.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/chat-token-route.ts apps/server/src/app.ts
git commit -m "feat(chat): add chat JWT token endpoint in main server"
```

---

## Task 10: Frontend - Types, Socket Client, Hooks

**Files:**

- Create: `apps/web/src/features/chat/types/index.ts`
- Create: `apps/web/src/features/chat/lib/socket-client.ts`
- Create: `apps/web/src/features/chat/lib/constants.ts`
- Create: `apps/web/src/features/chat/hooks/use-socket.ts`
- Create: `apps/web/src/features/chat/hooks/use-conversations.ts`
- Create: `apps/web/src/features/chat/hooks/use-messages.ts`
- Remove: `apps/web/src/features/chat/data/mock-data.ts`
- Remove: `apps/web/src/features/chat/hooks/use-chat.ts`
- Remove: `apps/web/src/features/chat/types/chat.ts`

**Ref:** `docs/FRONTEND-PATTERNS.md` Sec 4 (Data Fetching), Sec 7 (Re-renders). Follow hook pattern from `apps/web/src/features/clients/hooks/use-clients.ts`. Load `vercel-react-best-practices` skill.

**Install:** `pnpm --filter @app/web add socket.io-client`

- [ ] **Step 1: Create domain-aligned types**

```ts
// apps/web/src/features/chat/types/index.ts
// Mirror server domain types for frontend consumption:
// ConversationData, MessageData, ContactData, ChannelData
// ConversationStatus, MessageStatus, SenderType
// ConversationFilters, ListMeta
```

- [ ] **Step 2: Create Socket.IO client singleton**

```ts
// apps/web/src/features/chat/lib/socket-client.ts
import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(
    process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:3002',
    {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    }
  )

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
```

- [ ] **Step 3: Create useSocket hook**

```ts
// apps/web/src/features/chat/hooks/use-socket.ts
// Manages Socket.IO lifecycle:
// 1. On mount: fetch chat token from main server (POST /api/v1/chat/token)
// 2. Connect socket with token
// 3. Join lobby room (receives org-wide events)
// 4. Heartbeat interval (HEARTBEAT_INTERVAL_MS)
// 5. On disconnect/reconnect: emit CATCH_UP with lastEventTimestamp
// 6. Expose: socket, isConnected, onlineAgents
// 7. Cleanup on unmount
//
// Returns: { socket, isConnected, onlineAgents: Map<userId, {name, lastSeen}> }
```

- [ ] **Step 4: Create useConversations hook**

```ts
// apps/web/src/features/chat/hooks/use-conversations.ts
// React Query + Socket.IO hybrid:
// 1. useQuery for initial fetch (GET /chat/conversations with filters)
// 2. Socket listener for CONVERSATION_UPDATED: invalidate or setQueryData
// 3. Socket listener for UNREAD_UPDATE: update unread counts in cache
// 4. Socket listener for INCOMING_MESSAGE: update lastMessage in cache
// 5. Mutations: useAssignConversation, useTransferConversation, useCloseConversation, useReturnToQueue
// 6. staleTime: 60_000
//
// Returns: { conversations, isLoading, filters, setFilters, assign, transfer, close, returnToQueue }
```

- [ ] **Step 5: Create useMessages hook**

```ts
// apps/web/src/features/chat/hooks/use-messages.ts
// React Query + Socket.IO for a specific conversation:
// 1. useQuery for message history (GET /chat/conversations/:id with cursor pagination)
// 2. Socket listener for INCOMING_MESSAGE: append to cache (setQueryData)
// 3. Socket listener for MESSAGE_STATUS: update message status in cache
// 4. Socket listener for TYPING: set typingUser state
// 5. useSendMessage mutation: emit SEND_MESSAGE via socket (not HTTP)
// 6. markAsRead: POST /chat/conversations/:id/read on conversation open
// 7. Emit SUBSCRIBE_CONVERSATION on mount, UNSUBSCRIBE on unmount
// 8. Emit TYPING_START on input keystrokes (debounced)
//
// Returns: { messages, isLoading, sendMessage, typingUser, loadMore }
```

- [ ] **Step 6: Delete mock data and old hook**

Remove `data/mock-data.ts`, `hooks/use-chat.ts`, and `types/chat.ts` (replaced by real types/hooks).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/chat/types/ apps/web/src/features/chat/lib/ apps/web/src/features/chat/hooks/
git rm apps/web/src/features/chat/data/mock-data.ts apps/web/src/features/chat/hooks/use-chat.ts apps/web/src/features/chat/types/chat.ts
git commit -m "feat(chat): add frontend types, socket client, and react query hooks"
```

---

## Task 11: Frontend - Chat UI Components

**Files:**

- Modify: `apps/web/src/features/chat/components/chat-layout.tsx`
- Modify: `apps/web/src/features/chat/components/conversation-list.tsx`
- Modify: `apps/web/src/features/chat/components/chat-area.tsx`
- Modify: `apps/web/src/features/chat/components/contact-profile.tsx`
- Create: `apps/web/src/features/chat/components/chat-header.tsx`
- Create: `apps/web/src/features/chat/components/message-bubble.tsx`
- Create: `apps/web/src/features/chat/components/conversation-status-badge.tsx`
- Create: `apps/web/src/features/chat/components/typing-indicator.tsx`
- Create: `apps/web/src/features/chat/components/whatsapp-status.tsx`
- Create: `apps/web/src/app/(dashboard)/chat/page.tsx`
- Modify: `apps/web/src/app/globals.css` (add chat CSS tokens)

**Ref:** `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`. Load skills: `ui-ux-pro-max`, `shadcn`, `vercel-react-best-practices`.

**Key rule:** Use template UI as visual base, rewrite ALL logic from scratch with real hooks.

- [ ] **Step 1: Add chat CSS tokens to globals.css**

```css
/* Chat theme tokens */
@theme inline {
  --color-chat-bg: oklch(0.985 0.002 247.858);
  --color-chat-bubble-sent: oklch(0.35 0.05 200);
  --color-chat-bubble-sent-foreground: oklch(0.98 0 0);
  --color-chat-bubble-received: oklch(0.97 0.005 247.858);
  --color-chat-bubble-received-foreground: oklch(0.2 0 0);
  --color-chat-online: oklch(0.65 0.2 145);
  --color-chat-unread: oklch(0.55 0.15 200);
  --color-chat-timestamp: oklch(0.55 0.01 247.858);
  --color-chat-waiting: oklch(0.75 0.15 85); /* yellow for WAITING_HUMAN */
}

.dark {
  --color-chat-bg: oklch(0.15 0.005 247.858);
  --color-chat-bubble-sent: oklch(0.3 0.04 200);
  --color-chat-bubble-received: oklch(0.22 0.008 247.858);
  --color-chat-bubble-received-foreground: oklch(0.9 0 0);
  --color-chat-timestamp: oklch(0.6 0.01 247.858);
}

/* Chat scrollbar */
.chat-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.chat-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.chat-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(0.7 0 0 / 0.3);
  border-radius: 3px;
}

/* Chat animations */
@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes badge-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
.animate-message-in {
  animation: message-in 200ms ease-out;
}
.animate-badge-pulse {
  animation: badge-pulse 2s ease-in-out infinite;
}
```

- [ ] **Step 2: Create conversation-status-badge component**

```tsx
// Small badge showing conversation status with appropriate color:
// BOT_ACTIVE → purple "Bot"
// WAITING_HUMAN → yellow "Fila" (with border highlight per UI-PATTERNS)
// HUMAN_ACTIVE → green "Atendendo"
// CLOSED → gray "Fechada"
```

- [ ] **Step 3: Create typing-indicator component**

```tsx
// Shows "{name} esta digitando..." with animated dots.
// Receives typingUser from useMessages hook.
// Auto-hides after TYPING_TIMEOUT_MS.
```

- [ ] **Step 4: Extract message-bubble from chat-area**

Extract the message rendering into its own component (template's bubble UI is good, keep it). Add:

- System message style (centered, gray, italic) for BOT/SYSTEM senderType
- FAILED status shows red error icon + "Falha no envio"

- [ ] **Step 5: Create chat-header with agent actions**

```tsx
// Replaces template's Phone/Video/MoreVertical header buttons with:
// - Contact name + status badge + online indicator (from template)
// - Action buttons based on conversation status:
//   WAITING_HUMAN → [Assumir] primary button
//   HUMAN_ACTIVE (mine) → [Transferir] [Devolver] [Finalizar] via DropdownMenu
//   HUMAN_ACTIVE (other) → read-only badge "Atendido por {name}"
//   CLOSED → no actions
// - Typing indicator below header
```

- [ ] **Step 6: Adapt conversation-list for domain**

Update template's ConversationList:

- Replace `User` participant with `ContactData` (pushName, whatsappPhone)
- Add status filter tabs/chips: Todos | Fila | Meus | Fechados
- WAITING_HUMAN conversations get yellow left border (`border-l-4 border-chat-waiting`)
- Show conversation status badge next to contact name
- Show assigned agent name for HUMAN_ACTIVE conversations
- Unread count badge (keep template's design)
- Sort: unread first, then by lastMessageAt desc

- [ ] **Step 7: Adapt chat-layout for new hooks**

Replace `useChat()` with:

- `useSocket()` for connection management
- `useConversations()` for conversation list
- `useMessages(activeConversationId)` for message area
- Keep template's responsive layout (desktop 3-panel, mobile slide transitions)
- Add 4 UI states: Loading (skeleton), Error (retry), Empty ("Nenhuma conversa"), Success

- [ ] **Step 8: Adapt contact-profile for domain**

Replace generic User profile with:

- Contact info: whatsappPhone, pushName
- Conversation info: status, assignedTo, createdAt
- If contact has clientId: show "Ver cliente" link to `/clients/{clientId}` (future: lead capture)

- [ ] **Step 9: Create whatsapp-status component**

```tsx
// Shows channel connection status in conversation list header or sidebar.
// Receives channel status from Socket.IO (CHANNEL_STATUS event).
// States: CONNECTED (green dot), DISCONNECTED (red dot + "Reconectando..."), QR_PENDING (show QR)
```

- [ ] **Step 10: Create chat page**

```tsx
// apps/web/src/app/(dashboard)/chat/page.tsx
import { ChatLayout } from '@/features/chat/components/chat-layout'

export default function ChatPage() {
  return <ChatLayout />
}
```

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/features/chat/ apps/web/src/app/\(dashboard\)/chat/ apps/web/src/app/globals.css
git commit -m "feat(chat): add chat UI with real-time socket.io, conversations, messages, agent actions"
```

---

## Task 12: Quality Gates + Final Integration

- [ ] **Step 1: Fix imports and type errors**

Run `pnpm typecheck` from root and fix any type errors across all packages.

- [ ] **Step 2: Run linter**

```bash
pnpm lint
```

Fix all lint errors. Common issues: unused imports, missing return types on public functions.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Verify all apps build successfully (web, server, chat-server, chat-worker).

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Verify all tests pass (domain entity tests + use case tests).

- [ ] **Step 5: Manual smoke test**

1. Start Docker services (MongoDB, Redis, PostgreSQL)
2. Start all apps: `pnpm dev`
3. Navigate to `/chat` — verify layout renders (empty state)
4. Verify Socket.IO connects (connection indicator shows "Conectado")
5. Verify chat-server health: `curl http://localhost:3002/health`

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(chat): complete chat & messaging system (scope C: real-time, presence, unread, auto-close)"
```

---

## Dependency Graph

```
Task 1 (Models) ─────────────┬──→ Task 3 (Domain) → Task 4 (Use Cases) → Task 5 (Infra) → Task 6 (Routes) ──┐
                              │                                                                               │
Task 2 (Shared) ─────────────┤                                                                               │
                              │                                                                               ▼
                              ├──→ Task 7 (Worker Broker) → Task 8 (Worker Processors)              Task 9 (Token)
                              │                                                                               │
                              │                                                                               ▼
                              └──────────────────────────────────────────────────────────────→ Task 10 (Frontend Hooks)
                                                                                                       │
                                                                                                       ▼
                                                                                                Task 11 (Frontend UI)
                                                                                                       │
                                                                                                       ▼
                                                                                                Task 12 (Quality Gates)
```

**Parallelizable:** Tasks 3-6 (chat-server) || Tasks 7-8 (chat-worker). Task 9 can run parallel with 7-8.
**Task 10 depends on:** Task 6 (HTTP API) + Task 9 (chat token).
**Task 11 depends on:** Task 10 (hooks must exist before UI wires to them).
