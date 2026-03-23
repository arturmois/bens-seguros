# Chat Module Fixes & Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 32 issues across the real-time chat module — AI tool calling for lead capture, Socket.IO event routing, Baileys reconnection, domain transitions, frontend UX, and code quality.

**Architecture:** Backend-first approach. Start with shared constants and domain changes (foundation), then fix backend event routing (critical bugs), then Baileys improvements, then AI agent overhaul, then frontend corrections. Each task produces a working commit.

**Tech Stack:** TypeScript 5.9, Vercel AI SDK (generateText + tools), Socket.IO 4, BullMQ 5, Baileys v7, Next.js 16, React 19, Mongoose, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-23-chat-module-fixes-design.md`

---

## Task 1: Shared Constants & Types

**Files:**

- Modify: `packages/shared/src/socket-events.ts`

- [ ] **Step 1:** Add `RETURN_TO_BOT` to `SOCKET_EVENTS`

Add under the Conversations section:

```typescript
RETURN_TO_BOT: 'chat:return-to-bot',
```

- [ ] **Step 2:** Verify typecheck passes

Run: `pnpm --filter @repo/shared typecheck`

- [ ] **Step 3:** Commit

```bash
git add packages/shared/src/socket-events.ts
git commit -m "feat(shared): add RETURN_TO_BOT socket event constant"
```

---

## Task 2: Domain — returnToBot Transition (TDD)

**Files:**

- Modify: `apps/chat-server/src/domain/conversation.ts`
- Modify: `apps/chat-server/src/domain/conversation.spec.ts`

- [ ] **Step 1:** Write failing tests for `returnToBot` in `conversation.spec.ts`

Add a new `describe('returnToBot')` block after the existing `escalateToHuman` block. Tests:

1. `'returns HUMAN_ACTIVE to BOT_ACTIVE and clears assignment'` — create with `status: 'HUMAN_ACTIVE', assignedTo: 'agent-1', assignedToName: 'Joao'`, call `returnToBot()`, assert `status === 'BOT_ACTIVE'`, `assignedTo === null`, `assignedToName === null`
2. `'returns WAITING_HUMAN to BOT_ACTIVE'` — create with `status: 'WAITING_HUMAN'`, call `returnToBot()`, assert `status === 'BOT_ACTIVE'`
3. `'rejects from BOT_ACTIVE'` — expect throw `InvalidConversationTransitionError`
4. `'rejects from CLOSED'` — expect throw `InvalidConversationTransitionError`

Use the existing `makeConversation()` helper and match the test style from adjacent describe blocks.

- [ ] **Step 2:** Run tests — expect FAIL

Run: `pnpm --filter chat-server test -- --run src/domain/conversation.spec.ts`

- [ ] **Step 3:** Implement `returnToBot()` in `conversation.ts`

Add after `escalateToHuman()`:

```typescript
returnToBot(): void {
  if (this.props.status !== 'HUMAN_ACTIVE' && this.props.status !== 'WAITING_HUMAN') {
    throw ChatErrors.invalidTransition(this.props.status, 'voltar para IA')
  }
  this.props.assignedTo = null
  this.props.assignedToName = null
  this.props.status = 'BOT_ACTIVE'
  this.props.updatedAt = new Date()
}
```

- [ ] **Step 4:** Run tests — expect PASS

Run: `pnpm --filter chat-server test -- --run src/domain/conversation.spec.ts`

- [ ] **Step 5:** Commit

```bash
git add apps/chat-server/src/domain/conversation.ts apps/chat-server/src/domain/conversation.spec.ts
git commit -m "feat(domain): add returnToBot transition (HUMAN_ACTIVE|WAITING_HUMAN -> BOT_ACTIVE)"
```

---

## Task 3: ReturnToBot Use Case & Route

**Files:**

- Create: `apps/chat-server/src/application/return-to-bot.ts`
- Modify: `apps/chat-server/src/infra/http/routes/conversation-action-routes.ts`

- [ ] **Step 1:** Create `return-to-bot.ts` use case

Follow the pattern in `apps/chat-server/src/application/assign-conversation.ts`. The use case:

- Injects `ConversationRepository` via DI (`@inject('ConversationRepository')`)
- Has single `execute()` method taking `{ conversationId, tenantId }`
- Finds conversation, calls `conversation.returnToBot()`, persists via `updateStatus()`
- Returns `conversation.toJSON()`

- [ ] **Step 2:** Add `POST /chat/conversations/:id/return-to-bot` route

In `conversation-action-routes.ts`, add after the `/return` route. Follow the exact pattern of existing action routes — resolve use case from DI container, call execute, return `{ success: true, data: result }`, use `handleConversationError` for errors. Import `ReturnToBot` from the application layer.

- [ ] **Step 3:** Verify typecheck

Run: `pnpm --filter chat-server typecheck`

- [ ] **Step 4:** Commit

```bash
git add apps/chat-server/src/application/return-to-bot.ts apps/chat-server/src/infra/http/routes/conversation-action-routes.ts
git commit -m "feat(chat-server): add return-to-bot use case and POST route"
```

---

## Task 4: Fix Incoming Message Processor (Race Condition + New Conv Events)

**Files:**

- Modify: `apps/chat-worker/src/processors/incoming-message-processor.ts`

- [ ] **Step 1:** Replace `findOrCreateConversation` with atomic upsert

Replace the two separate functions (`upsertContact` stays, `findOrCreateConversation` gets replaced) with `findOrCreateConversationAtomic` that:

- Takes a single options object `{ tenantId, channelId, contactId, phone, hasAiUser }` (not 5 params)
- Uses `Conversation.findOneAndUpdate()` with `upsert: true` and `rawResult: true`
- Filter: `{ tenantId, channelId, contactId, status: { $ne: 'CLOSED' } }`
- Update: `{ $setOnInsert: { tenantId, channelId, contactId, whatsappPhone: phone, status: initialStatus } }`
- Returns `{ id: string, status: string, isNew: boolean }`
- Determines `isNew` via `Boolean(result.lastErrorObject?.upserted)`

- [ ] **Step 2:** Publish `CONVERSATION_UPDATE` when new conversation is created

After saving the message and updating `lastMessage`, if `isNew` is true:

```typescript
if (isNew) {
  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
    JSON.stringify({
      tenantId,
      conversationId,
      status: conversationStatus,
      isNew: true,
    })
  )
}
```

- [ ] **Step 3:** Fix `UNREAD_UPDATE` payload to include `userId`

Lookup the conversation's `assignedTo` and include it:

```typescript
await pubsubClient.publish(
  CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE,
  JSON.stringify({ tenantId, conversationId, userId: null })
)
```

For new conversations there is no `assignedTo`, so `userId: null` is correct. The redis-subscriber fallback (Task 6) handles this by emitting to the lobby.

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter chat-worker typecheck`

- [ ] **Step 5:** Commit

```bash
git add apps/chat-worker/src/processors/incoming-message-processor.ts
git commit -m "fix(chat-worker): atomic conversation upsert + CONVERSATION_UPDATE for new convs"
```

---

## Task 5: Fix MESSAGE_STATUS Missing conversationId

**Files:**

- Modify: `apps/chat-worker/src/processors/send-message-processor.ts`

- [ ] **Step 1:** Add `conversationId` to `SendMessageJobData` interface

Add `readonly conversationId: string` to the interface.

- [ ] **Step 2:** Include `conversationId` in `MESSAGE_STATUS` publish

Add `conversationId: job.data.conversationId` to the JSON payload in the success path.

- [ ] **Step 3:** Verify typecheck

Run: `pnpm --filter chat-worker typecheck`

- [ ] **Step 4:** Commit

```bash
git add apps/chat-worker/src/processors/send-message-processor.ts
git commit -m "fix(chat-worker): include conversationId in MESSAGE_STATUS pub/sub payload"
```

---

## Task 6: Fix Redis Subscriber — Dedup + Unread Fallback

**Files:**

- Modify: `apps/chat-server/src/infra/pubsub/redis-subscriber.ts`

- [ ] **Step 1:** Fix `INCOMING_MESSAGE` to use `.except()` and prevent duplicate delivery

Change the `INCOMING_MESSAGE` case to emit to the conversation room first, then to the lobby room using `.except(conversationRoom)` so agents subscribed to both don't receive the event twice.

- [ ] **Step 2:** Fix `UNREAD_UPDATE` to always emit to lobby as fallback

When `userId` is present, emit to the user-specific room. Additionally, always emit to the lobby room so all agents can update unread badges in the conversation list.

- [ ] **Step 3:** Verify typecheck

Run: `pnpm --filter chat-server typecheck`

- [ ] **Step 4:** Commit

```bash
git add apps/chat-server/src/infra/pubsub/redis-subscriber.ts
git commit -m "fix(chat-server): prevent duplicate INCOMING_MESSAGE + fix UNREAD_UPDATE delivery"
```

---

## Task 7: Fix Socket Handler — Agent Broadcast + User Room + Format

**Files:**

- Modify: `apps/chat-server/src/infra/socket/socket-handler.ts`

- [ ] **Step 1:** Join user-specific room on connect

In `io.on('connection')`, after `void socket.join(lobbyRoom)`, add:

```typescript
void socket.join(`tenant:${user.organizationId}:user:${user.userId}`)
```

- [ ] **Step 2:** Broadcast agent messages after SEND_MESSAGE

In `registerMessageEvents`, after `useCase.execute()` returns `result`, build a message payload and broadcast:

- Use `socket.to(convRoom)` to emit to the conversation room (excludes sender)
- Use `socket.to(lobbyRoom).except(convRoom)` to emit to the lobby (avoids double delivery)

- [ ] **Step 3:** Fix `CHANNEL_STATUS_GET` response format

Change `ok: true` to `success: true` and `ok: false` to `success: false`.

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter chat-server typecheck`

- [ ] **Step 5:** Commit

```bash
git add apps/chat-server/src/infra/socket/socket-handler.ts
git commit -m "fix(chat-server): agent message broadcast + user room + consistent ack format"
```

---

## Task 8: Fix SendMessage — Validate whatsappPhone

**Files:**

- Modify: `apps/chat-server/src/application/send-message.ts`

- [ ] **Step 1:** Add null check for `whatsappPhone` before enqueuing

After finding the conversation and checking it exists, validate `conversation.whatsappPhone` is non-null. Throw `ChatErrors.invalidTransition(conversation.status, 'enviar mensagem sem numero WhatsApp')` if null.

- [ ] **Step 2:** Verify typecheck

Run: `pnpm --filter chat-server typecheck`

- [ ] **Step 3:** Commit

```bash
git add apps/chat-server/src/application/send-message.ts
git commit -m "fix(chat-server): validate whatsappPhone before enqueuing send"
```

---

## Task 9: Baileys Broker — Backoff + Clean Disconnect + Logger

**Files:**

- Modify: `apps/chat-worker/src/messaging/baileys-broker.ts`

- [ ] **Step 1:** Add reconnection state properties

Add `private reconnectAttempts = 0` and `private readonly maxReconnectAttempts = 20` to the class.

- [ ] **Step 2:** Change logger level from `'silent'` to `process.env['BAILEYS_LOG_LEVEL'] ?? 'warn'`

- [ ] **Step 3:** Add `calculateBackoffDelay()` private method

Formula: `Math.min(RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts), 120_000) + Math.random() * 1000`

- [ ] **Step 4:** Update `handleConnectionUpdate` — backoff with limit

In the `connection === 'close'` + `shouldReconnect` branch: increment `reconnectAttempts`, if > `maxReconnectAttempts` emit DISCONNECTED and return, otherwise schedule reconnect with `calculateBackoffDelay()`.

- [ ] **Step 5:** Reset counter on `connection === 'open'`

Add `this.reconnectAttempts = 0` in the open handler.

- [ ] **Step 6:** Clean disconnect — call `socket.ev.removeAllListeners()` before `socket.end()`, reset `reconnectAttempts`

- [ ] **Step 7:** Verify typecheck

Run: `pnpm --filter chat-worker typecheck`

- [ ] **Step 8:** Commit

```bash
git add apps/chat-worker/src/messaging/baileys-broker.ts
git commit -m "fix(baileys): exponential backoff + configurable logger + clean disconnect"
```

---

## Task 10: Baileys Manager — Session Cleanup

**Files:**

- Modify: `apps/chat-worker/src/messaging/baileys-manager.ts`

- [ ] **Step 1:** Add `cleanupSession(channelId)` exported function

Uses `rm` from `node:fs/promises` with `{ recursive: true, force: true }` to remove the session directory. Path: `resolve(SESSIONS_DIR, channelId)` where `SESSIONS_DIR = process.env['BAILEYS_SESSIONS_DIR'] ?? './baileys-sessions'`. Log success and warn on failure.

- [ ] **Step 2:** Verify typecheck

Run: `pnpm --filter chat-worker typecheck`

- [ ] **Step 3:** Commit

```bash
git add apps/chat-worker/src/messaging/baileys-manager.ts
git commit -m "feat(baileys): add session cleanup for deactivated channels"
```

---

## Task 11: AI Package — generateWithTools

**Files:**

- Create: `packages/ai/src/generate-with-tools.ts`
- Modify: `packages/ai/src/types.ts`
- Modify: `packages/ai/src/index.ts`

- [ ] **Step 1:** Add types in `types.ts`

Add `GenerateWithToolsOptions` (with `messages: ModelMessage[]`, `tools: ToolSet`, `maxSteps?: number`) and `GenerateWithToolsResult` (with `text: string`, `toolResults`, `steps: number`). Import `ModelMessage` and `ToolSet` from `'ai'`.

- [ ] **Step 2:** Create `generate-with-tools.ts`

Function that calls `generateText` with `model`, `system`, `messages`, `tools`, `maxSteps`, `maxTokens`, `temperature`. Extracts tool results from `result.steps`. Returns `{ text, toolResults, steps }`.

- [ ] **Step 3:** Export from `index.ts`

Add exports for `generateWithTools`, `GenerateWithToolsOptions`, `GenerateWithToolsResult`.

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter @repo/ai typecheck`

- [ ] **Step 5:** Commit

```bash
git add packages/ai/src/
git commit -m "feat(ai): add generateWithTools with maxSteps for tool calling"
```

---

## Task 12: AI Tools — escalar, consultar, captar

**Files:**

- Create: `apps/chat-worker/src/tools/escalar-para-humano.ts`
- Create: `apps/chat-worker/src/tools/consultar-produtos.ts`
- Create: `apps/chat-worker/src/tools/captar-lead.ts`

- [ ] **Step 1:** Create `escalar-para-humano.ts` — factory function taking `(conversationId, tenantId, pubsubClient)`, returns a `tool()` that transitions conversation to WAITING_HUMAN, creates SYSTEM message, publishes CONVERSATION_UPDATE.

- [ ] **Step 2:** Create `consultar-produtos.ts` — factory function returning a `tool()` with empty params that returns hardcoded list of insurance types.

- [ ] **Step 3:** Create `captar-lead.ts` — factory function taking `(tenantId, contactPhone)`, returns a `tool()` that calls `POST ${INTERNAL_API_URL}/api/proposals` with `X-Internal-Token` and `X-Tenant-Id` headers. On failure, returns friendly error message. Uses `fetch` (Node 22 built-in). Uses env vars `INTERNAL_API_URL` and `INTERNAL_API_TOKEN`.

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter chat-worker typecheck`

- [ ] **Step 5:** Commit

```bash
git add apps/chat-worker/src/tools/
git commit -m "feat(chat-worker): add AI tools - captarLead, escalarParaHumano, consultarProdutos"
```

---

## Task 13: Refactor AI Bot Processor

**Files:**

- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts`

- [ ] **Step 1:** Rewrite the processor with these changes:

1. Import `generateWithTools` from `@repo/ai` and the 3 tool factories
2. Add typed helper `getAiAgentConfig(doc)` that returns strongly-typed config without `as` assertions
3. Add `buildConversationMessages(recentMessages)` that converts Mongoose docs to `ModelMessage[]` with proper `role: 'user' | 'assistant'` mapping
4. Add `buildSystemPrompt(tenantName, contactName, customPrompt?)` that assembles a rich prompt with corretora context
5. Main flow: validate conversation is BOT_ACTIVE, load AI agent, check max responses fallback, build messages + prompt, call `generateWithTools` with all 3 tools, check if escalation tool was called (if so, return — tool already handled it), save bot response, publish, enqueue WhatsApp send

- [ ] **Step 2:** Verify typecheck

Run: `pnpm --filter chat-worker typecheck`

- [ ] **Step 3:** Commit

```bash
git add apps/chat-worker/src/processors/ai-bot-processor.ts
git commit -m "refactor(chat-worker): AI bot with tool calling + SRP decomposition"
```

---

## Task 14: AI Agent API Routes

**Files:**

- Create: `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`
- Modify: `apps/chat-server/src/app.ts`

- [ ] **Step 1:** Create route file with `GET /chat/channels/:id/ai-agent` and `PUT /chat/channels/:id/ai-agent`

GET: returns existing AiAgent doc or defaults. PUT: validates with Zod schema, upserts via `AiAgent.findOneAndUpdate()`. Import `AiAgent` from `@repo/db-chat`.

- [ ] **Step 2:** Register in `app.ts`

Add import and register alongside existing chat route files under the authenticated prefix.

- [ ] **Step 3:** Verify typecheck

Run: `pnpm --filter chat-server typecheck`

- [ ] **Step 4:** Commit

```bash
git add apps/chat-server/src/infra/http/routes/ai-agent-routes.ts apps/chat-server/src/app.ts
git commit -m "feat(chat-server): add GET/PUT /chat/channels/:id/ai-agent routes"
```

---

## Task 15: Frontend — Types + ChatActions Context + returnToBot Mutation

**Files:**

- Modify: `apps/web/src/features/chat/types/index.ts`
- Create: `apps/web/src/features/chat/components/chat-actions-context.tsx`
- Modify: `apps/web/src/features/chat/hooks/use-conversations.ts`

- [ ] **Step 1:** Add `mediaUrl?: string | null` to `MessageData` type

- [ ] **Step 2:** Add `returnToBot` mutation to `useConversations` (follow `closeConversation` pattern, endpoint: `POST /chat/conversations/${id}/return-to-bot`, toast: 'Conversa devolvida para a IA')

- [ ] **Step 3:** Create `chat-actions-context.tsx` with `ChatActionsProvider` and `useChatActions()` hook. The context holds all mutation results + `onlineAgents`.

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 5:** Commit

```bash
git add apps/web/src/features/chat/
git commit -m "feat(web): ChatActionsContext + returnToBot mutation + mediaUrl type"
```

---

## Task 16: Frontend — Transfer Modal

**Files:**

- Create: `apps/web/src/features/chat/components/transfer-agent-modal.tsx`

- [ ] **Step 1:** Create dialog component

Uses shadcn Dialog. Shows list of online agents from `useChatActions().onlineAgents` (excluding current user). Each agent: avatar initial circle + name. Click to select (highlighted border), then "Confirmar Transferencia" button. Empty state: "Nenhum agente disponivel". On confirm: calls `transferConversation.mutate({ id, toUserId, toUserName })`.

- [ ] **Step 2:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 3:** Commit

```bash
git add apps/web/src/features/chat/components/transfer-agent-modal.tsx
git commit -m "feat(web): transfer agent selection modal"
```

---

## Task 17: Frontend — Chat Header (Return to Bot + Confirmation Dialog)

**Files:**

- Modify: `apps/web/src/features/chat/components/chat-header.tsx`

- [ ] **Step 1:** Add "Voltar para IA" dropdown item (Bot icon from lucide-react, calls `onReturnToBot`)

- [ ] **Step 2:** Wrap "Finalizar" with AlertDialog confirmation (Title: "Encerrar conversa?", destructive action button)

- [ ] **Step 3:** Consume `useChatActions()` instead of receiving action props

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 5:** Commit

```bash
git add apps/web/src/features/chat/components/chat-header.tsx
git commit -m "feat(web): return-to-bot button + close confirmation dialog"
```

---

## Task 18: Frontend — ChatLayout Refactor

**Files:**

- Modify: `apps/web/src/features/chat/components/chat-layout.tsx`

- [ ] **Step 1:** Wrap with `ChatActionsProvider`, passing mutations from `useConversations` + `onlineAgents` from `useSocket`

- [ ] **Step 2:** Remove action handler props from ChatArea/ChatHeader (they now use context)

- [ ] **Step 3:** Add `TransferAgentModal` state + integration (open on transfer action, pass selected conversation ID)

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 5:** Commit

```bash
git add apps/web/src/features/chat/components/chat-layout.tsx
git commit -m "refactor(web): ChatActionsContext provider + transfer modal integration"
```

---

## Task 19: Frontend — Media Message Rendering

**Files:**

- Modify: `apps/web/src/features/chat/components/message-bubble.tsx`

- [ ] **Step 1:** Add type-based rendering before the text paragraph

IMAGE: `<Image>` from next/image, AUDIO: `<audio controls>`, VIDEO: `<video controls>`, DOCUMENT: `<a>` download link with FileText icon, OTHER: italic gray fallback. Only show text `<p>` if `message.text` is non-empty. Import `FileText` from lucide-react.

- [ ] **Step 2:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 3:** Commit

```bash
git add apps/web/src/features/chat/components/message-bubble.tsx
git commit -m "feat(web): render IMAGE, AUDIO, VIDEO, DOCUMENT media messages"
```

---

## Task 20: Frontend — Smart Auto-scroll + Remove Placeholders

**Files:**

- Modify: `apps/web/src/features/chat/components/chat-area.tsx`

- [ ] **Step 1:** Replace auto-scroll with IntersectionObserver pattern

Add `isAtBottomRef` and `observerTargetRef`. Observer tracks if user is at bottom. Only scroll to end when `isAtBottomRef.current` is true and messages change. Place `<div ref={observerTargetRef} className="h-1" />` above `<div ref={messagesEndRef} />`.

- [ ] **Step 2:** Remove Smile and Paperclip placeholder buttons from `MessageInput`

Remove the two `<Button>` elements and their lucide-react imports.

- [ ] **Step 3:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 4:** Commit

```bash
git add apps/web/src/features/chat/components/chat-area.tsx
git commit -m "fix(web): smart auto-scroll + remove placeholder buttons"
```

---

## Task 21: Frontend — Search Debounce

**Files:**

- Modify: `apps/web/src/features/chat/components/conversation-list.tsx`

- [ ] **Step 1:** Add local `searchInput` state + 300ms debounce with `setTimeout`/`clearTimeout` before updating filters

- [ ] **Step 2:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 3:** Commit

```bash
git add apps/web/src/features/chat/components/conversation-list.tsx
git commit -m "fix(web): debounce conversation search input (300ms)"
```

---

## Task 22: Frontend — Socket Token Rotation

**Files:**

- Modify: `apps/web/src/features/chat/lib/socket-client.ts`
- Modify: `apps/web/src/features/chat/hooks/use-socket.ts`

- [ ] **Step 1:** In `getSocket()`, if socket exists and is connected, update `socket.auth` with fresh token

- [ ] **Step 2:** In `use-socket.ts`, listen to `socket.io.on('reconnect_attempt')` and refresh the token via `getChatToken()`

- [ ] **Step 3:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 4:** Commit

```bash
git add apps/web/src/features/chat/lib/socket-client.ts apps/web/src/features/chat/hooks/use-socket.ts
git commit -m "fix(web): refresh Socket.IO auth token on reconnect"
```

---

## Task 23: Frontend — Notifications

**Files:**

- Create: `apps/web/src/features/chat/lib/notifications.ts`
- Modify: `apps/web/src/features/chat/hooks/use-message-socket-handlers.ts`
- Modify: `apps/web/src/features/chat/hooks/use-socket.ts`

- [ ] **Step 1:** Create `notifications.ts` with `playNotificationSound()`, `requestNotificationPermission()`, `showBrowserNotification()`. Sound file at `/sounds/notification.mp3`. All functions guard against SSR with `typeof window === 'undefined'`.

- [ ] **Step 2:** Add a notification sound mp3 to `apps/web/public/sounds/`

- [ ] **Step 3:** In `useMessageSocketHandlers`, trigger sound + browser notification on `INCOMING_MESSAGE` when `document.hidden` and sender is not `'AGENT'`

- [ ] **Step 4:** In `use-socket.ts`, call `requestNotificationPermission()` on first connect

- [ ] **Step 5:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 6:** Commit

```bash
git add apps/web/src/features/chat/lib/notifications.ts apps/web/public/sounds/ apps/web/src/features/chat/hooks/
git commit -m "feat(web): notification sound + browser notifications for messages"
```

---

## Task 24: Frontend — Message Pagination

**Files:**

- Modify: `apps/web/src/features/chat/hooks/use-messages.ts`
- Modify: `apps/web/src/features/chat/components/chat-area.tsx`

- [ ] **Step 1:** Add `loadOlderMessages` to `useMessages`

Track `hasOlderMessages` and `isLoadingOlder` state. Function fetches older messages via cursor `?before=${oldestMessageId}`, prepends to cache. Sets `hasOlderMessages = false` when no results.

- [ ] **Step 2:** Add scroll-to-top trigger in `chat-area.tsx`

Add `onScroll` handler that calls `loadOlderMessages()` when `scrollTop === 0`. Show loading spinner at top when loading.

- [ ] **Step 3:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 4:** Commit

```bash
git add apps/web/src/features/chat/hooks/use-messages.ts apps/web/src/features/chat/components/chat-area.tsx
git commit -m "feat(web): load older messages on scroll up"
```

---

## Task 25: Frontend — AI Agent Config UI

**Files:**

- Create: `apps/web/src/features/channels/components/ai-agent-config-sheet.tsx`
- Modify: `apps/web/src/features/channels/components/channels-table.tsx`
- Modify: `apps/web/src/features/channels/hooks/use-channels.ts`

- [ ] **Step 1:** Add `useAiAgentConfig(channelId)` and `useUpdateAiAgent()` hooks in `use-channels.ts`

- [ ] **Step 2:** Create `ai-agent-config-sheet.tsx` — Sheet with form fields: system prompt (Textarea), provider (Select: Claude/OpenAI), temperature (Input number 0-1), max tokens (Input number 100-2000), max respostas (Input number 5-100), ativo (Switch). Uses React Hook Form + Zod.

- [ ] **Step 3:** Add "Configurar IA" (Brain icon) dropdown action in `channels-table.tsx`. Wire state to open the sheet.

- [ ] **Step 4:** Verify typecheck

Run: `pnpm --filter web typecheck`

- [ ] **Step 5:** Commit

```bash
git add apps/web/src/features/channels/
git commit -m "feat(web): AI agent configuration UI (Settings > Canais)"
```

---

## Task 26: Code Quality — Remove `as` Assertions

**Files:**

- Modify: `apps/chat-worker/src/messaging/baileys-broker.ts`

- [ ] **Step 1:** Add `isMessageMetadata()` type guard and replace `as Record<string, unknown>` in `getMessageForRetry`

- [ ] **Step 2:** Verify typecheck

Run: `pnpm --filter chat-worker typecheck`

- [ ] **Step 3:** Commit

```bash
git add apps/chat-worker/src/messaging/baileys-broker.ts
git commit -m "fix(baileys): replace as assertion with type guard"
```

---

## Task 27: Final Verification

- [ ] **Step 1:** Run full lint: `pnpm lint`
- [ ] **Step 2:** Run full typecheck: `pnpm typecheck`
- [ ] **Step 3:** Run all tests: `pnpm test`
- [ ] **Step 4:** Run build: `pnpm build`
- [ ] **Step 5:** Fix any issues and commit

```bash
git commit -m "chore: fix lint/type/test issues from chat module improvements"
```
