# Fase 6: AI & Notifications - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar AI bot para chat (Vercel AI SDK multi-provider, Claude Sonnet primary), sistema de notificacoes in-app (Socket.IO) + email (Resend + React Email).

**Architecture:** @repo/ai encapsula Vercel AI SDK com multi-provider. Chat-worker usa AI para respostas automaticas quando conversa esta em BOT_ACTIVE. Notificacoes sao criadas por domain events e entregues via Socket.IO (online) ou email (offline).

**Tech Stack:** Vercel AI SDK, @anthropic-ai/sdk, Resend, React Email, BullMQ.

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md` (Secoes 8.9 AI, 8.11 Notificacoes)

**Depends on:** Fase 4 (commissions) + Fase 5 (chat)

---

## File Structure

```
packages/ai/src/
├── index.ts                        # Multi-provider setup
├── providers.ts                    # Claude + OpenAI config
├── generate.ts                     # generateText/streamText wrappers
└── types.ts

apps/chat-worker/src/
├── processors/
│   └── ai-bot-processor.ts         # AI response generation

packages/core/src/modules/
├── notification/
│   ├── domain/
│   │   ├── notification-repository.ts
│   │   └── notification-types.ts
│   ├── application/
│   │   ├── create-notification.ts
│   │   ├── list-notifications.ts
│   │   ├── mark-as-read.ts
│   │   └── send-email-notification.ts
│   └── infrastructure/
│       ├── prisma-notification-repository.ts
│       └── resend-email-provider.ts

packages/db/prisma/schema.prisma     # Add Notification model

apps/server/src/
├── routes/v1/notification-routes.ts
├── handlers/notification.handlers.ts

apps/web/src/
├── features/notifications/
│   ├── components/
│   │   ├── notification-bell.tsx
│   │   ├── notification-dropdown.tsx
│   │   └── notification-item.tsx
│   └── hooks/
│       └── use-notifications.ts

apps/web/src/emails/                 # React Email templates
├── commission-approved.tsx
├── claim-opened.tsx
├── policy-expiring.tsx
└── invitation.tsx
```

---

## Task 1: @repo/ai - Multi-Provider Setup

**Files:**

- Modify: `packages/ai/package.json`
- Create: `packages/ai/src/providers.ts`
- Create: `packages/ai/src/generate.ts`
- Create: `packages/ai/src/types.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 1: Update package.json**

```json
{
  "name": "@repo/ai",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "ai": "^4.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create providers.ts**

```ts
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'

export type AIProvider = 'claude' | 'openai'

export function getModel(provider: AIProvider = 'claude') {
  switch (provider) {
    case 'claude':
      return anthropic('claude-sonnet-4-20250514')
    case 'openai':
      return openai('gpt-4o-mini')
  }
}
```

- [ ] **Step 3: Create generate.ts**

```ts
import { generateText, streamText } from 'ai'
import { getModel, type AIProvider } from './providers.js'

interface GenerateOptions {
  systemPrompt: string
  userMessage: string
  provider?: AIProvider
  maxTokens?: number
  temperature?: number
}

export async function generate(options: GenerateOptions): Promise<string> {
  const { text } = await generateText({
    model: getModel(options.provider),
    system: options.systemPrompt,
    prompt: options.userMessage,
    maxTokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
  })
  return text
}

export function stream(options: GenerateOptions) {
  return streamText({
    model: getModel(options.provider),
    system: options.systemPrompt,
    prompt: options.userMessage,
    maxTokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
  })
}
```

- [ ] **Step 4: Create index.ts barrel**

```ts
export { generate, stream } from './generate.js'
export { getModel, type AIProvider } from './providers.js'
```

- [ ] **Step 5: Commit**

```bash
git add packages/ai/
git commit -m "feat: add @repo/ai with vercel ai sdk multi-provider (claude + openai)"
```

---

## Task 2: AI Bot Processor (Chat-Worker)

**Files:**

- Create: `apps/chat-worker/src/processors/ai-bot-processor.ts`
- Modify: `apps/chat-worker/src/index.ts`

- [ ] **Step 1: Create ai-bot-processor**

```ts
import { Worker, type Job } from 'bullmq'
import { generate } from '@repo/ai'
import { Message, Conversation, AiAgent } from '@repo/db-chat'
import pino from 'pino'

const logger = pino({ name: 'ai-bot-processor' })

interface AiBotJob {
  conversationId: string
  tenantId: string
  messageText: string
  contactName: string
}

export function createAiBotProcessor(connection: import('ioredis').default) {
  return new Worker<AiBotJob>(
    'chat-ai-bot',
    async (job: Job<AiBotJob>) => {
      const { conversationId, tenantId, messageText, contactName } = job.data

      // Check if conversation is still in BOT_ACTIVE
      const conversation = await Conversation.findById(conversationId)
      if (!conversation || conversation.status !== 'BOT_ACTIVE') return

      // Get AI agent config for this tenant
      const aiAgent = await AiAgent.findOne({ tenantId })
      if (!aiAgent?.isActive) return

      // Get recent messages for context
      const recentMessages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()

      const context = recentMessages
        .reverse()
        .map((m) => `${m.senderType}: ${m.text}`)
        .join('\n')

      // Generate AI response
      const systemPrompt =
        aiAgent.systemPrompt ??
        `Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro. Se o cliente quiser falar com um atendente humano, diga que vai transferi-lo.`

      const response = await generate({
        systemPrompt,
        userMessage: `Contexto da conversa:\n${context}\n\nNova mensagem de ${contactName}: ${messageText}`,
        provider: (aiAgent.provider as 'claude' | 'openai') ?? 'claude',
        maxTokens: aiAgent.maxTokens ?? 300,
        temperature: aiAgent.temperature ?? 0.7,
      })

      // Save bot response
      await Message.create({
        conversationId,
        tenantId,
        senderType: 'BOT',
        senderName: 'Assistente Virtual',
        text: response,
        type: 'TEXT',
        status: 'PENDING',
      })

      // Enqueue for sending via WhatsApp
      // (triggers send-message-processor)

      logger.info({ conversationId }, 'AI bot response generated')
    },
    { connection, concurrency: 5 }
  )
}
```

- [ ] **Step 2: Wire into chat-worker index.ts**
- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/
git commit -m "feat: add ai bot processor with claude sonnet for automated chat responses"
```

---

## Task 3: Notification Model + Module

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/core/src/modules/notification/`

- [ ] **Step 1: Add Notification model to Prisma**

```prisma
model Notification {
  id              String    @id @default(cuid())
  organizationId  String
  userId          String
  type            String    // CLAIM_OPENED, COMMISSION_APPROVED, POLICY_EXPIRING, etc.
  title           String
  body            String
  entityType      String?   // Claim, Commission, Policy, etc.
  entityId        String?
  read            Boolean   @default(false)
  readAt          DateTime?
  emailSent       Boolean   @default(false)
  createdAt       DateTime  @default(now())

  user            User      @relation(fields: [userId], references: [id])

  @@index([organizationId, userId, read])
  @@index([organizationId, createdAt(sort: Desc)])
}
```

- [ ] **Step 2: Generate and push**

```bash
cd packages/db && pnpm db:generate && pnpm db:push
```

- [ ] **Step 3: Create notification use cases**

- `CreateNotification` - creates notification, publishes Socket.IO event, enqueues email if user offline
- `ListNotifications` - paginated list per user
- `MarkAsRead` - marks single or bulk as read

- [ ] **Step 4: Commit**

```bash
git add packages/db/ packages/core/src/modules/notification/
git commit -m "feat: add notification module with in-app + email delivery"
```

---

## Task 4: Resend + React Email Integration

**Files:**

- Create: `packages/core/src/modules/notification/infrastructure/resend-email-provider.ts`
- Create: `apps/web/src/emails/commission-approved.tsx`
- Create: `apps/web/src/emails/claim-opened.tsx`
- Create: `apps/web/src/emails/policy-expiring.tsx`
- Create: `apps/web/src/emails/invitation.tsx`

- [ ] **Step 1: Create email provider**

```ts
import { Resend } from 'resend'
import { injectable } from 'tsyringe'

export interface EmailPayload {
  to: string
  subject: string
  html: string
}

@injectable()
export class ResendEmailProvider {
  private client: Resend

  constructor() {
    this.client = new Resend(process.env.RESEND_API_KEY)
  }

  async send(payload: EmailPayload): Promise<void> {
    await this.client.emails.send({
      from: 'Bens Seguros <noreply@bens.com.br>',
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })
  }
}
```

- [ ] **Step 2: Create React Email templates**

Example `commission-approved.tsx`:

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Hr,
} from '@react-email/components'

interface CommissionApprovedProps {
  userName: string
  policyNumber: string
  value: string
  approvedBy: string
}

export function CommissionApprovedEmail(props: CommissionApprovedProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#f4f4f5' }}
      >
        <Container
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: 20,
            backgroundColor: '#fff',
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 600, color: '#1f4b5f' }}>
            Comissao Aprovada
          </Text>
          <Hr />
          <Text>Ola {props.userName},</Text>
          <Text>
            Sua comissao referente a apolice{' '}
            <strong>{props.policyNumber}</strong> no valor de{' '}
            <strong>{props.value}</strong> foi aprovada por {props.approvedBy}.
          </Text>
          <Button
            href="https://app.bens.com.br/commissions"
            style={{
              backgroundColor: '#1f4b5f',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 6,
            }}
          >
            Ver Comissao
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 3: Create remaining email templates (claim, policy-expiring, invitation)**
- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/notification/infrastructure/ apps/web/src/emails/
git commit -m "feat: add resend email provider with react email templates"
```

---

## Task 5: Notification Worker Jobs

**Files:**

- Modify: `apps/worker/src/index.ts`
- Create: `apps/worker/src/processors/notification-processor.ts`
- Create: `apps/worker/src/processors/policy-expiry-processor.ts`

- [ ] **Step 1: Create notification-processor**

Processes `send-notification` jobs. Delivers via Socket.IO (online) or email (offline).

- [ ] **Step 2: Create policy-expiry-processor**

Scheduled job (daily cron via BullMQ repeatable). Finds policies expiring in 30 days, creates notifications.

- [ ] **Step 3: Commit**

```bash
git add apps/worker/
git commit -m "feat: add notification and policy-expiry worker processors"
```

---

## Task 6: Notification API Routes

- [ ] **Step 1: Create routes**

```
GET  /api/v1/notifications          - list user notifications
POST /api/v1/notifications/:id/read - mark as read
POST /api/v1/notifications/read-all - mark all as read
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/
git commit -m "feat: add notification API routes"
```

---

## Task 7: Frontend - Notification Bell

- [ ] **Step 1: Create notification-bell component (icon + unread badge)**
- [ ] **Step 2: Create notification-dropdown (list recent, mark as read)**
- [ ] **Step 3: Create notification-item component**
- [ ] **Step 4: Hook into Socket.IO for real-time notifications**

```ts
socket.on(SOCKET_EVENTS.NOTIFICATION, (notification) => {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  toast.info(notification.title)
})
```

- [ ] **Step 5: Add bell to header.tsx**
- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/notifications/ apps/web/src/components/layout/header.tsx
git commit -m "feat: add notification bell with real-time updates and dropdown"
```

---

## Task 8: Wire Event-Driven Notifications

- [ ] **Step 1: Create notification triggers in use cases**

| Event                     | Notification                 |
| ------------------------- | ---------------------------- |
| Claim created             | Notify ADMIN + MANAGER       |
| Commission approved       | Notify salesperson           |
| Commission rejected       | Notify salesperson           |
| Policy expiring (30 days) | Notify salesperson + MANAGER |
| Invitation accepted       | Notify inviter               |

- [ ] **Step 2: Enqueue notification jobs from use cases**
- [ ] **Step 3: Test email delivery via Resend**
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete AI bot + notification system (in-app + email)"
```
