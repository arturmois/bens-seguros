# Fase 5: Chat & Messaging - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar chat-server e chat-worker completos: Mongoose models, Broker pattern (Baileys primary + Meta fallback), conversations com state machine, Socket.IO real-time, BullMQ job processing, lead capture.

**Architecture:** Chat-server (Fastify + Socket.IO) gerencia conversas e mensagens via REST + WebSocket. Chat-worker (BullMQ) processa envio/recebimento de mensagens e mantem conexao Baileys. Redis pub/sub conecta os dois. MongoDB via Mongoose para persistencia do dominio de chat.

**Tech Stack:** Mongoose, Socket.IO 4, BullMQ 5, Baileys 7, Redis pub/sub, Zod, Fastify 5.

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md` (Secao 8.9)

**Depends on:** Fase 1 completa (Auth)

---

## File Structure

```
packages/db-chat/src/
├── models/
│   ├── channel.model.ts
│   ├── conversation.model.ts
│   ├── message.model.ts
│   ├── contact.model.ts
│   ├── lead-capture.model.ts
│   ├── ai-agent.model.ts
│   ├── unread-count.model.ts
│   └── baileys-auth-state.model.ts
├── connection.ts
└── index.ts

apps/chat-server/src/
├── domain/
│   ├── types.ts                      # Conversation, Message, Contact types
│   ├── ports/
│   │   ├── conversation-repository.ts
│   │   ├── message-repository.ts
│   │   └── contact-repository.ts
├── application/
│   ├── save-incoming-message.ts
│   ├── send-message.ts
│   ├── list-conversations.ts
│   ├── get-conversation.ts
│   ├── assign-conversation.ts
│   ├── close-conversation.ts
│   └── capture-lead.ts
├── infra/
│   ├── http/
│   │   ├── routes/
│   │   │   ├── conversation-routes.ts
│   │   │   ├── channel-routes.ts
│   │   │   └── webhook-routes.ts
│   │   └── middleware/
│   │       └── jwt-middleware.ts
│   ├── socket/
│   │   ├── socket-handler.ts
│   │   └── socket-auth.ts
│   ├── repository/
│   │   ├── mongoose-conversation-repository.ts
│   │   ├── mongoose-message-repository.ts
│   │   └── mongoose-contact-repository.ts
│   ├── queue/
│   │   ├── queue-definitions.ts
│   │   └── queue-producer.ts
│   ├── pubsub/
│   │   ├── redis-publisher.ts
│   │   └── redis-subscriber.ts
│   └── di/
│       └── registry.ts
├── app.ts
└── index.ts

apps/chat-worker/src/
├── processors/
│   ├── send-message-processor.ts
│   ├── incoming-message-processor.ts
│   └── ai-bot-processor.ts
├── messaging/
│   ├── broker.ts                     # Broker interface
│   ├── baileys-broker.ts             # Baileys implementation (primary)
│   ├── meta-broker.ts                # Meta API implementation (fallback)
│   └── broker-factory.ts
├── baileys/
│   ├── baileys-manager.ts            # Connection lifecycle
│   └── baileys-auth-store.ts         # MongoDB-backed auth state
└── index.ts

apps/web/src/features/chat/
├── components/
│   ├── chat-layout.tsx
│   ├── conversation-list.tsx
│   ├── conversation-panel.tsx
│   ├── message-list.tsx
│   ├── message-input.tsx
│   ├── message-bubble.tsx
│   ├── chat-header.tsx
│   └── whatsapp-status.tsx
├── hooks/
│   ├── use-socket.ts
│   ├── use-conversations.ts
│   └── use-messages.ts
├── lib/
│   └── socket-client.ts
└── types/
    └── index.ts

apps/web/src/app/(dashboard)/chat/
└── page.tsx
```

---

## Task 1: Mongoose Models (@repo/db-chat)

**Files:**

- Create: all models in `packages/db-chat/src/models/`
- Modify: `packages/db-chat/src/index.ts`

- [ ] **Step 1: Create Channel model**

```ts
import mongoose, { Schema, type Document } from 'mongoose';

export interface IChannel extends Document {
  tenantId: string;
  name: string;
  type: 'WHATSAPP' | 'WEB';
  brokerType: 'BAILEYS' | 'META';
  phoneNumber?: string;
  isActive: boolean;
  lastConnectedAt?: Date;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<IChannel>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['WHATSAPP', 'WEB'], required: true },
    brokerType: { type: String, enum: ['BAILEYS', 'META'], default: 'BAILEYS' },
    phoneNumber: String,
    isActive: { type: Boolean, default: true },
    lastConnectedAt: Date,
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

channelSchema.index({ tenantId: 1, type: 1 });

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
```

- [ ] **Step 2: Create Conversation model**

```ts
import mongoose, { Schema, type Document } from 'mongoose';

export interface IConversation extends Document {
  tenantId: string;
  channelId: string;
  contactId: string;
  status: 'BOT_ACTIVE' | 'WAITING_HUMAN' | 'HUMAN_ACTIVE' | 'CLOSED';
  assignedTo?: string;
  subject?: string;
  lastMessageText?: string;
  lastMessageAt?: Date;
  whatsappPhone?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    tenantId: { type: String, required: true },
    channelId: { type: String, required: true },
    contactId: { type: String, required: true },
    status: {
      type: String,
      enum: ['BOT_ACTIVE', 'WAITING_HUMAN', 'HUMAN_ACTIVE', 'CLOSED'],
      default: 'BOT_ACTIVE',
    },
    assignedTo: String,
    subject: String,
    lastMessageText: String,
    lastMessageAt: Date,
    whatsappPhone: String,
    closedAt: Date,
  },
  { timestamps: true },
);

conversationSchema.index({ tenantId: 1, status: 1 });
conversationSchema.index({ tenantId: 1, contactId: 1, channelId: 1 }, { unique: true });
conversationSchema.index({ tenantId: 1, updatedAt: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
```

- [ ] **Step 3: Create Message model (with TTL)**

```ts
import mongoose, { Schema, type Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  tenantId: string;
  senderType: 'CLIENT' | 'AGENT' | 'BOT' | 'SYSTEM';
  senderName?: string;
  senderId?: string;
  text?: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  mediaUrl?: string;
  mediaKey?: string; // R2 storage key after migration
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  metadata?: Record<string, unknown>;
  externalId?: string; // WhatsApp message ID
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true },
    senderType: { type: String, enum: ['CLIENT', 'AGENT', 'BOT', 'SYSTEM'], required: true },
    senderName: String,
    senderId: String,
    text: String,
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'OTHER'],
      default: 'TEXT',
    },
    mediaUrl: String,
    mediaKey: String,
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
      default: 'PENDING',
    },
    metadata: Schema.Types.Mixed,
    externalId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL: 730 days
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 730 * 24 * 60 * 60 });
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
```

- [ ] **Step 4: Create Contact, LeadCapture, AiAgent, UnreadCount, BaileysAuthState models**
- [ ] **Step 5: Export all from index.ts**
- [ ] **Step 6: Commit**

```bash
git add packages/db-chat/
git commit -m "feat: add mongoose models (channel, conversation, message, contact, lead-capture)"
```

---

## Task 2: Chat-Server - Domain + Use Cases

- [ ] **Step 1: Create domain types and repository ports**
- [ ] **Step 2: Create SaveIncomingMessage use case**
- [ ] **Step 3: Create SendMessage use case**
- [ ] **Step 4: Create ListConversations, GetConversation use cases**
- [ ] **Step 5: Create AssignConversation, CloseConversation use cases**
- [ ] **Step 6: Create CaptureLead use case**
- [ ] **Step 7: Commit**

```bash
git add apps/chat-server/src/application/ apps/chat-server/src/domain/
git commit -m "feat: add chat use cases (save message, send, list, assign, close, capture lead)"
```

---

## Task 3: Chat-Server - Infrastructure (Repositories, Socket.IO, Pub/Sub)

- [ ] **Step 1: Create Mongoose repository implementations**
- [ ] **Step 2: Create JWT middleware for HTTP routes**
- [ ] **Step 3: Create Socket.IO auth handler**

```ts
import { verify } from 'jsonwebtoken';
import type { Socket } from 'socket.io';

export function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = verify(token, process.env.SOCKET_JWT_SECRET ?? '');
    socket.data.user = payload;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
```

- [ ] **Step 4: Create Socket.IO event handler**

```ts
import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@repo/shared';

export function setupSocketHandlers(io: Server) {
  io.use(socketAuth);

  io.on('connection', (socket: Socket) => {
    const { tenantId } = socket.data.user;
    socket.join(`tenant:${tenantId}`);

    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
      // Enqueue message for sending via BullMQ
    });

    socket.on('disconnect', () => {
      // Update presence
    });
  });
}
```

- [ ] **Step 5: Create Redis pub/sub publisher + subscriber**

Publisher publishes events: `INCOMING_MESSAGE`, `MESSAGE_STATUS`, `CHANNEL_STATUS`.
Subscriber listens and broadcasts to Socket.IO rooms.

- [ ] **Step 6: Create BullMQ queue definitions + producer**
- [ ] **Step 7: Commit**

```bash
git add apps/chat-server/src/infra/
git commit -m "feat: add chat infra (mongoose repos, socket.io, redis pub/sub, bullmq queues)"
```

---

## Task 4: Chat-Server - HTTP Routes

- [ ] **Step 1: Create conversation routes**

```
GET  /chat/conversations         - list conversations (cursor pagination)
GET  /chat/conversations/:id     - get conversation with recent messages
POST /chat/conversations/:id/assign - assign to agent
POST /chat/conversations/:id/close  - close conversation
POST /chat/conversations/:id/messages - send message (HTTP alternative)
```

- [ ] **Step 2: Create channel routes**

```
GET    /chat/channels       - list channels
POST   /chat/channels       - create channel
PUT    /chat/channels/:id   - update channel
DELETE /chat/channels/:id   - delete channel
```

- [ ] **Step 3: Create webhook routes (Meta)**

```
GET  /chat/webhook/meta     - Meta verification (challenge)
POST /chat/webhook/meta     - Receive Meta events (signature validation)
```

- [ ] **Step 4: Wire everything in app.ts**
- [ ] **Step 5: Commit**

```bash
git add apps/chat-server/
git commit -m "feat: add chat HTTP routes (conversations, channels, meta webhook)"
```

---

## Task 5: Chat-Worker - Broker Pattern + Baileys

- [ ] **Step 1: Create Broker interface**

```ts
export interface MessagePayload {
  to: string; // phone number
  text?: string;
  mediaUrl?: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
}

export interface MessageResult {
  externalId: string;
  status: 'SENT' | 'FAILED';
}

export interface Broker {
  sendMessage(payload: MessagePayload): Promise<MessageResult>;
  isConnected(): boolean;
}
```

- [ ] **Step 2: Implement BaileysBroker (primary)**

```ts
import { makeWASocket, useMultiFileAuthState, type WASocket } from 'baileys';
import type { Broker, MessagePayload, MessageResult } from './broker.js';
import pino from 'pino';

export class BaileysBroker implements Broker {
  private socket: WASocket | null = null;

  async connect(authDir: string): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.socket = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
    });

    this.socket.ev.on('creds.update', saveCreds);

    this.socket.ev.on('connection.update', (update) => {
      // Publish connection status via Redis pub/sub
    });

    this.socket.ev.on('messages.upsert', (msg) => {
      // Enqueue incoming messages via BullMQ
    });
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    if (!this.socket) throw new Error('Not connected');

    const jid = `${payload.to}@s.whatsapp.net`;

    const result = await this.socket.sendMessage(jid, {
      text: payload.text ?? '',
    });

    return {
      externalId: result?.key?.id ?? '',
      status: 'SENT',
    };
  }

  isConnected(): boolean {
    return this.socket !== null;
  }
}
```

- [ ] **Step 3: Implement MetaBroker (fallback)**

```ts
export class MetaBroker implements Broker {
  private token: string;
  private phoneNumberId: string;

  constructor(token: string, phoneNumberId: string) {
    this.token = token;
    this.phoneNumberId = phoneNumberId;
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'text',
          text: { body: payload.text },
        }),
      },
    );

    const data = await response.json();
    return {
      externalId: data.messages?.[0]?.id ?? '',
      status: response.ok ? 'SENT' : 'FAILED',
    };
  }

  isConnected(): boolean {
    return true; // Meta API is always "connected"
  }
}
```

- [ ] **Step 4: Create BrokerFactory**

```ts
import { BaileysBroker } from './baileys-broker.js';
import { MetaBroker } from './meta-broker.js';
import type { Broker } from './broker.js';

export function createBroker(type: 'BAILEYS' | 'META'): Broker {
  switch (type) {
    case 'BAILEYS':
      return new BaileysBroker();
    case 'META':
      return new MetaBroker(
        process.env.META_WHATSAPP_TOKEN ?? '',
        process.env.META_WHATSAPP_PHONE_NUMBER_ID ?? '',
      );
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/chat-worker/src/messaging/
git commit -m "feat: add broker pattern with baileys (primary) and meta api (fallback)"
```

---

## Task 6: Chat-Worker - Job Processors

- [ ] **Step 1: Create send-message-processor**

Picks up `chat-send-message` jobs. Uses broker to send, updates message status via pub/sub.

- [ ] **Step 2: Create incoming-message-processor**

Picks up `chat-incoming-message` jobs. Persists message, updates conversation, publishes event.

- [ ] **Step 3: Wire processors to BullMQ workers in index.ts**
- [ ] **Step 4: Commit**

```bash
git add apps/chat-worker/
git commit -m "feat: add chat-worker job processors (send, incoming) with baileys connection"
```

---

## Task 7: Frontend - Chat UI

- [ ] **Step 1: Create socket-client.ts**

```ts
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_CHAT_SERVER_URL ?? 'http://localhost:3002', {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
}
```

- [ ] **Step 2: Create use-socket hook**
- [ ] **Step 3: Create conversation-list component**
- [ ] **Step 4: Create message-list + message-bubble components**
- [ ] **Step 5: Create message-input component**
- [ ] **Step 6: Create chat-layout (split panel: list + conversation)**
- [ ] **Step 7: Create whatsapp-status component (shows QR, connected/disconnected)**
- [ ] **Step 8: Create chat page**
- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/chat/ apps/web/src/app/\(dashboard\)/chat/
git commit -m "feat: add chat UI with real-time socket.io, conversation list, message panel"
```

---

## Task 8: Validate Chat Flow End-to-End

- [ ] **Step 1: Start all services (docker + pnpm dev)**
- [ ] **Step 2: Configure a Baileys channel**
- [ ] **Step 3: Scan QR code on WhatsApp Web**
- [ ] **Step 4: Send a message from WhatsApp to the number**
- [ ] **Step 5: Verify message appears in real-time on chat UI**
- [ ] **Step 6: Reply from chat UI, verify delivery on WhatsApp**
- [ ] **Step 7: Run quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: complete chat & messaging system (baileys + meta + socket.io + real-time)"
```
