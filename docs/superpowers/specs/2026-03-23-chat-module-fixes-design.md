# Chat Module Fixes & Improvements — Design Spec

**Date:** 2026-03-23
**Status:** Approved
**Scope:** 32 fixes across 3 priority phases (Critical, High, Medium)

---

## Context

Critical analysis of the real-time chat module revealed issues in 6 areas: Baileys WhatsApp integration, Socket.IO event routing, AI agent capabilities, message flow consistency, frontend UX, and missing features. This spec defines the design for all corrections.

### Key Decisions

- **AI approach:** Tool Calling Simples with `generateText` + `maxSteps: 5` (Vercel AI SDK)
- **AI tools (v1):** `captarLead`, `escalarParaHumano`, `consultarProdutos`
- **No streaming:** WhatsApp delivers messages atomically — streaming adds no value

---

## 1. AI Agent Module

### 1.1 Tool Calling Architecture

**File:** `packages/ai/src/generate-with-tools.ts`

Add `generateWithTools` function:

- Uses `generateText` from Vercel AI SDK with `maxSteps` (default 5)
- Accepts `messages[]` array for proper conversation history (not flat string)
- Returns both text response and tool results for logging/auditing
- Existing `generate()` remains unchanged for backward compatibility

### 1.2 AI Tools

**Directory:** `apps/chat-worker/src/tools/`

#### `captar-lead.ts`

- Registers client interest in insurance and creates a proposal in the ERP
- Input: nomeCliente, tipoSeguro (AUTO|VIDA|RESIDENCIAL|EMPRESARIAL|VIAGEM|OUTRO), detalhes, telefone
- Integration: calls main API (`apps/api`) via internal HTTP to create proposal (respects DDD boundaries)

#### `escalar-para-humano.ts`

- Transfers to human agent. Used when client explicitly asks, subject requires human decision, or topic is sensitive
- Input: motivo (reason for transfer)
- Action: transitions conversation to WAITING_HUMAN, creates SYSTEM message, publishes CONVERSATION_UPDATE

#### `consultar-produtos.ts`

- Returns insurance types offered by the brokerage
- Input: none
- Returns hardcoded list for v1 (configurable via AI Agent settings later)

### 1.3 AI Bot Processor Refactor

**File:** `apps/chat-worker/src/processors/ai-bot-processor.ts`

Changes:

1. **Context format:** Convert recent messages to `ModelMessage[]` array instead of flat string
2. **Remove duplicate message:** Last message appears only once in the messages array
3. **Enriched system prompt:** Include tenant name (from Channel lookup) and contact name
4. **Tool calling:** Use `generateWithTools` with the 3 tools
5. **Escalation via tool:** `escalarParaHumano` tool replaces manual escalation. Max-responses count remains as fallback safety net
6. **SRP decomposition:** Extract into smaller functions: `buildConversationMessages()`, `buildSystemPrompt()`, `handleBotResponse()`, `handleToolResults()`

### 1.4 AI Agent Configuration UI

**Location:** Settings > Canais > "Configurar IA" button per channel row

**New components:**

- `apps/web/src/features/channels/components/ai-agent-config-sheet.tsx`
- Fields: system prompt (textarea), provider (select: Claude/OpenAI), temperature (slider 0-1), max tokens (number), max respostas por conversa (number), ativo (switch)
- Validation: Zod schema `aiAgentConfigSchema`

**New API endpoints:**

- `GET /chat/channels/:id/ai-agent` — Returns current AI agent config
- `PUT /chat/channels/:id/ai-agent` — Upsert AI agent config

**New route file:** `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`

---

## 2. Socket.IO & Pub/Sub Event Fixes

### 2.1 New Conversations Invisible (Critical)

**Fix in** `incoming-message-processor.ts`:

- `findOrCreateConversation` returns `{ id, status, isNew }`
- If `isNew`, publish `CONVERSATION_UPDATE` with full conversation data
- Frontend already handles `CONVERSATION_UPDATED` via query invalidation

### 2.2 MESSAGE_STATUS Missing conversationId (Critical)

**Fix in** `send-message-processor.ts`:

- Add `conversationId` to `SendMessageJobData` interface
- Include `conversationId` in `MESSAGE_STATUS` pub/sub payload

**Fix in** `send-message.ts` use case:

- Include `conversationId` when enqueuing the job

### 2.3 Duplicate Messages in Frontend (High)

**Fix in** `redis-subscriber.ts`:

- For `INCOMING_MESSAGE`: emit to conversation room, then emit to lobby using `.except(conversationRoom)`

### 2.4 UNREAD_UPDATE Never Arrives (Medium)

**Fix in** `incoming-message-processor.ts`:

- Include `userId` (assignedTo) in `UNREAD_UPDATE` payload

**Fix in** `socket-handler.ts`:

- On connection, join `tenant:${orgId}:user:${userId}` room

**Fix in** `redis-subscriber.ts`:

- Fallback: if no `userId`, emit to lobby instead of dropping

### 2.5 Agent Messages Not Visible to Others (Medium)

**Fix in** `send-message.ts` use case:

- After creating message, publish `INCOMING_MESSAGE` via pub/sub with `senderType: 'AGENT'`
- Validate `whatsappPhone` is non-null before enqueuing

### 2.6 Inconsistent Response Format (Low)

**Fix in** `socket-handler.ts`:

- Change `CHANNEL_STATUS_GET` ack from `{ ok: true }` to `{ success: true }`

---

## 3. Baileys Broker Improvements

### 3.1 Reconnection with Exponential Backoff

**File:** `apps/chat-worker/src/messaging/baileys-broker.ts`

- Formula: `min(3 * 2^(attempt-1), 120) + jitter(0-1s)` seconds
- Max attempts: 20
- After max: emit DISCONNECTED, log error, stop retrying
- Reset counter on successful connection

### 3.2 Logger Level Configuration

- Change from `level: 'silent'` to `level: process.env.BAILEYS_LOG_LEVEL ?? 'warn'`

### 3.3 Clean Disconnect

- Call `socket.ev.removeAllListeners()` before `socket.end()`
- Prevents ghost events on nullified socket

### 3.4 Session Cleanup

**File:** `apps/chat-worker/src/messaging/baileys-manager.ts`

- Add `cleanupSession(channelId)` that removes session directory
- Called when channel is deactivated
- Use env var `BAILEYS_SESSIONS_DIR` for path (default: `./baileys-sessions`)

### 3.5 getMessage for Retry Fix

- Remove `as` assertion in `getMessageForRetry`
- Use type guard instead
- Save `WAMessage.message` in `metadata` field during incoming message processing

---

## 4. Domain — New Conversation Transitions

### 4.1 returnToBot

**Entity:** `ConversationEntity.returnToBot()`

- Valid from: `HUMAN_ACTIVE`
- Transitions to: `BOT_ACTIVE`
- Clears `assignedTo` and `assignedToName`

**Use case:** `ReturnToBot` (injectable)
**Route:** `POST /chat/conversations/:id/return-to-bot`
**Socket event:** `RETURN_TO_BOT` added to `SOCKET_EVENTS`

### 4.2 Race Condition Fix

**File:** `incoming-message-processor.ts`

Replace `findOne` + `create` with atomic `findOneAndUpdate` + `upsert: true`:

```typescript
const conversation = await Conversation.findOneAndUpdate(
  { tenantId, channelId, contactId, status: { $ne: 'CLOSED' } },
  { $setOnInsert: { tenantId, channelId, contactId, whatsappPhone, status } },
  { upsert: true, new: true }
)
  .lean()
  .exec()
```

Determine `isNew` by comparing `createdAt === updatedAt`.

---

## 5. Frontend UX Fixes

### 5.1 Transfer Modal

**New:** `features/chat/components/transfer-agent-modal.tsx`

- Dialog with list of online agents (from `useSocket().onlineAgents`)
- Avatar + name + role per agent
- Click to select, confirm to transfer
- Disabled if no agents online

### 5.2 Return to Bot Button

**File:** `chat-header.tsx`

- Add "Voltar para IA" in dropdown when HUMAN_ACTIVE + current user assigned
- Only visible if channel has AI agent configured

### 5.3 Confirmation Dialog for Close

**File:** `chat-header.tsx`

- Wrap "Finalizar" with AlertDialog
- Title: "Encerrar conversa?"
- Actions: "Cancelar" / "Encerrar" (destructive)

### 5.4 Media Message Rendering

**File:** `message-bubble.tsx`

- IMAGE: Next.js Image with aspect-ratio container, click for lightbox
- AUDIO: HTML5 audio player
- VIDEO: HTML5 video player
- DOCUMENT: Download link with file icon
- OTHER: "Midia nao suportada" fallback

### 5.5 Smart Auto-Scroll

**File:** `chat-area.tsx`

- Use IntersectionObserver to track if user is at bottom
- Only auto-scroll when new message arrives AND user was at bottom

### 5.6 Search Debounce

**File:** `conversation-list.tsx`

- 300ms debounce on search input using `useDeferredValue` or setTimeout

### 5.7 Remove Placeholder Buttons

**File:** `chat-area.tsx`

- Remove emoji (Smile) and attachment (Paperclip) buttons until implemented

### 5.8 Chat Actions Context

**New:** `features/chat/components/chat-actions-context.tsx`

- Context provider with assign, transfer, returnToQueue, returnToBot, close mutations
- Eliminates 6+ props from drilling chain through ChatLayout > ChatArea > ChatHeader

### 5.9 Socket.IO Token Rotation

**File:** `socket-client.ts` + `use-socket.ts`

- Update `socket.auth` with fresh token on reconnect attempts
- Listen to `socket.io.on('reconnect_attempt')` to refresh token

### 5.10 Unread Badge

**File:** `conversation-list.tsx`

- Badge with unread count per conversation
- Data from new endpoint `GET /chat/conversations/unread-counts`
- Real-time via `UNREAD_UPDATE` socket event

### 5.11 Message Pagination

**File:** `use-messages.ts` + `chat-area.tsx`

- Initial: last 50 messages
- Scroll to top: fetch older via cursor `before={oldestMessageId}`
- Prepend to messages array
- Loading spinner at top while fetching

### 5.12 Notifications

**New:** `features/chat/lib/notifications.ts`

- `playNotificationSound()` via Audio API
- `showBrowserNotification(title, body)` via Notification API
- Triggered when INCOMING_MESSAGE arrives and tab is hidden (`document.hidden`)

---

## 6. Code Quality Fixes

### 6.1 Remove `as` Assertions

| File                             | Fix                               |
| -------------------------------- | --------------------------------- |
| `baileys-broker.ts:138`          | Type guard `isWAMessageContent()` |
| `ai-bot-processor.ts` (multiple) | Typed helper `getAiAgentConfig()` |

### 6.2 SRP Decomposition

**`ai-bot-processor.ts`:**

- `buildConversationMessages()` — converts to ModelMessage[]
- `buildSystemPrompt()` — assembles prompt with tenant data
- `handleBotResponse()` — saves + publishes + enqueues

**`incoming-message-processor.ts`:**

- `findOrCreateConversationAtomic()` — uses options object
- `publishMessageEvents()` — handles pub/sub
- `triggerAiBotIfNeeded()` — conditional AI enqueue

---

## 7. Files Summary

### New Files (10)

- `packages/ai/src/generate-with-tools.ts`
- `apps/chat-worker/src/tools/captar-lead.ts`
- `apps/chat-worker/src/tools/escalar-para-humano.ts`
- `apps/chat-worker/src/tools/consultar-produtos.ts`
- `apps/chat-server/src/application/return-to-bot.ts`
- `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`
- `apps/web/src/features/channels/components/ai-agent-config-sheet.tsx`
- `apps/web/src/features/chat/components/transfer-agent-modal.tsx`
- `apps/web/src/features/chat/components/chat-actions-context.tsx`
- `apps/web/src/features/chat/lib/notifications.ts`

### Modified Files (26)

- `packages/ai/src/index.ts`
- `packages/ai/src/types.ts`
- `packages/shared/src/socket-events.ts`
- `apps/chat-worker/src/processors/ai-bot-processor.ts`
- `apps/chat-worker/src/processors/incoming-message-processor.ts`
- `apps/chat-worker/src/processors/send-message-processor.ts`
- `apps/chat-worker/src/messaging/baileys-broker.ts`
- `apps/chat-worker/src/messaging/baileys-manager.ts`
- `apps/chat-server/src/domain/conversation.ts`
- `apps/chat-server/src/application/send-message.ts`
- `apps/chat-server/src/infra/socket/socket-handler.ts`
- `apps/chat-server/src/infra/pubsub/redis-subscriber.ts`
- `apps/chat-server/src/infra/http/routes/conversation-action-routes.ts`
- `apps/web/src/features/chat/components/chat-layout.tsx`
- `apps/web/src/features/chat/components/chat-header.tsx`
- `apps/web/src/features/chat/components/chat-area.tsx`
- `apps/web/src/features/chat/components/message-bubble.tsx`
- `apps/web/src/features/chat/components/conversation-list.tsx`
- `apps/web/src/features/chat/hooks/use-conversations.ts`
- `apps/web/src/features/chat/hooks/use-messages.ts`
- `apps/web/src/features/chat/hooks/use-message-socket-handlers.ts`
- `apps/web/src/features/chat/hooks/use-socket.ts`
- `apps/web/src/features/chat/lib/socket-client.ts`
- `apps/web/src/features/channels/components/channels-table.tsx`
- `apps/web/src/features/channels/hooks/use-channels.ts`
- `apps/web/src/features/channels/types/index.ts`

---

## 8. Out of Scope

- Full DI refactor of chat-worker
- Emoji picker and file upload by agent
- Conversation export (PDF/CSV)
- In-conversation search
- Push notifications (service worker)
- Multiple AI models per channel
- CPF/client lookup tool (cross-database)
