# QA Bugfixes - AI Tools Chat System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 bugs + 1 bonus issue found in the QA report for the chat AI tools system, ordered by criticality (P0 first).

**Architecture:** The bugs span 3 apps: `apps/widget` (React SPA), `apps/chat-server` (Fastify + Socket.IO), and `apps/chat-worker` (BullMQ processor). Fixes are independent per bug — each task can be implemented and tested in isolation. The widget uses a hybrid REST + Socket.IO message delivery model; the chat-worker uses Vercel AI SDK `generateText` with tools.

**Tech Stack:** TypeScript 5.9, React 19 (Vite widget), Fastify 5, Socket.IO 4, BullMQ 5, Mongoose (MongoDB), Vercel AI SDK, Zod.

---

## Task 1: BUG-004 — Validate AI provider API keys before generating (P0)

**Files:**

- Modify: `apps/chat-worker/src/processors/ai-bot-helpers.ts:33-51`
- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts:163-181`

**Problem:** When provider is `claude` but `ANTHROPIC_API_KEY` is empty/undefined, `generateWithTools` throws at runtime. The catch block silently escalates to human with no warning log. Same for `openai` + missing `OPENAI_API_KEY`. In production, if a key expires, ALL bot conversations silently escalate.

**Root cause:** `getAiAgentConfig()` doesn't check API key availability. `providers.ts` creates instances with `env.ANTHROPIC_API_KEY` (optional, can be `undefined`). Error is caught generically at line 174.

- [ ] **Step 1: Add `isProviderConfigured` helper to `ai-bot-helpers.ts`**

Add this function after `getAiAgentConfig` (after line 51), plus the needed imports:

```typescript
// Add to imports at top of file
import type { AIProvider } from '@repo/ai'
import { env } from '@repo/env'

// Add after getAiAgentConfig function
export function isProviderConfigured(provider: AIProvider): boolean {
  switch (provider) {
    case 'claude':
      return Boolean(env.ANTHROPIC_API_KEY)
    case 'openai':
      return Boolean(env.OPENAI_API_KEY)
  }
}
```

- [ ] **Step 2: Use validation in `ai-bot-processor.ts` before calling `generateWithTools`**

In `ai-bot-processor.ts`, after `const config = getAiAgentConfig(...)` (line 78), add a guard:

```typescript
if (!isProviderConfigured(config.provider)) {
  logger.error(
    { conversationId, tenantId, provider: config.provider },
    'AI provider API key not configured — all bot conversations will escalate. Check ANTHROPIC_API_KEY / OPENAI_API_KEY in .env'
  )
  await escalateToHuman(conversationId, tenantId, pubsubClient)
  return
}
```

Update the import to include `isProviderConfigured`:

```typescript
import {
  type AiBotJobData,
  ESCALATION_TOOL_NAME,
  buildConversationMessages,
  buildSystemPrompt,
  escalateToHuman,
  getAiAgentConfig,
  isProviderConfigured,
} from './ai-bot-helpers.js'
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm --filter @app/chat-worker exec tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```
fix: validate AI provider API key before generating bot response (BUG-004)
```

---

## Task 2: BUG-001 — Deduplicate messages in widget Socket.IO + REST hybrid (P0)

**Files:**

- Modify: `apps/widget/src/hooks/use-widget-socket.ts:68-72`

**Problem:** The widget loads messages via REST `fetchMessages()` (lines 30-48) and simultaneously listens for `WIDGET_INCOMING_MESSAGE` via Socket.IO (lines 68-72). When a BOT message arrives during or shortly after the REST fetch, it appears twice because `setMessages((prev) => [...prev, message])` appends without checking for duplicates.

**Root cause:** No deduplication by message ID in the Socket.IO handler.

- [ ] **Step 1: Add deduplication to the Socket.IO message handler**

In `use-widget-socket.ts`, modify the `WIDGET_INCOMING_MESSAGE` handler (lines 68-81):

```typescript
socket.on(
  SOCKET_EVENTS.WIDGET_INCOMING_MESSAGE,
  (data: Record<string, unknown>) => {
    const message = parseIncomingMessage(data)
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })

    // Clear typing indicator when a message arrives
    setTyping({ isTyping: false, name: null })
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }
)
```

The key change: `prev.some((m) => m.id === message.id)` checks if the message is already in state before appending. If it's a duplicate, we return `prev` unchanged (React skips re-render for same reference).

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @app/widget exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Verify build passes**

Run: `pnpm --filter @app/widget build`
Expected: successful Vite build

- [ ] **Step 4: Commit**

```
fix: deduplicate widget messages from Socket.IO + REST overlap (BUG-001)
```

---

## Task 3: BUG-002 — Deliver SYSTEM escalation messages to widget (P1)

**Files:**

- Modify: `apps/chat-worker/src/processors/ai-bot-helpers.ts:120-143`

**Problem:** When bot escalates to human, `escalateToHuman()` creates a SYSTEM message in MongoDB but does NOT publish it to the `INCOMING_MESSAGE` Redis pub/sub channel. It only publishes a `CONVERSATION_UPDATE` event. The widget never receives the SYSTEM message via Socket.IO.

**Root cause:** `escalateToHuman()` calls `Message.create()` (line 130) but never calls `pubsubClient.publish(CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE, ...)` for that message.

Note: `message-bubble.tsx` already renders SYSTEM messages with centered italic styling (lines 27-48), so no widget UI changes needed.

- [ ] **Step 1: Publish SYSTEM message to Redis pub/sub in `escalateToHuman`**

In `ai-bot-helpers.ts`, replace the `escalateToHuman` function (lines 120-143) with:

```typescript
export async function escalateToHuman(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
): Promise<void> {
  await Conversation.updateOne(
    { _id: conversationId, tenantId },
    { $set: { status: 'WAITING_HUMAN' } }
  ).exec()

  const systemMessage = await Message.create({
    conversationId,
    tenantId,
    senderType: 'SYSTEM',
    text: 'Transferido para um atendente. Aguarde.',
    type: 'TEXT',
    status: 'DELIVERED',
  })

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
    JSON.stringify({
      id: String(systemMessage._id),
      conversationId,
      tenantId,
      senderType: 'SYSTEM',
      senderName: null,
      senderId: null,
      text: 'Transferido para um atendente. Aguarde.',
      type: 'TEXT',
      status: 'DELIVERED',
      externalId: null,
      createdAt:
        systemMessage.createdAt?.toISOString() ?? new Date().toISOString(),
    })
  )

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
    JSON.stringify({ tenantId, conversationId, status: 'WAITING_HUMAN' })
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @app/chat-worker exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```
fix: publish SYSTEM escalation message to Redis pub/sub for widget delivery (BUG-002)
```

---

## Task 4: BUG-005 — Send explanatory BOT message before escalating in reportClaim (P1)

**Files:**

- Modify: `apps/chat-worker/src/tools/report-claim.ts:128-140`

**Problem:** When `reportClaim` doesn't find an active policy, it saves claim data to metadata and calls `escalateToHuman()` directly. The client only sees "Transferido para um atendente. Aguarde." (SYSTEM message) with no context about why.

**Root cause:** The tool escalates without creating an intermediate BOT message. The tool returns a message string to the AI, but since escalation already happened, the AI response is never sent.

- [ ] **Step 1: Add explanatory BOT message before escalation in `report-claim.ts`**

Update imports at top of file. Replace `import { Conversation } from '@repo/db-chat'` (line 6) and `import { signRequest } from '@repo/shared'` (line 5) with:

```typescript
import { signRequest, CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import { Conversation, Message } from '@repo/db-chat'
```

Then replace the `if (!json.data.claimCreated && json.data.claimData)` block (lines 128-140) with:

```typescript
if (!json.data.claimCreated && json.data.claimData) {
  await Conversation.updateOne(
    { _id: conversationId, tenantId },
    { $set: { 'metadata.claimData': json.data.claimData } }
  ).exec()

  const explanationText =
    'Não encontrei uma apólice ativa vinculada ao seu cadastro. ' +
    'Seus dados do sinistro foram salvos e vou transferir você para ' +
    'um corretor que poderá dar continuidade ao atendimento.'

  const botMessage = await Message.create({
    conversationId,
    tenantId,
    senderType: 'BOT',
    senderName: 'Assistente Virtual',
    text: explanationText,
    type: 'TEXT',
    status: 'PENDING',
  })

  await pubsubClient.publish(
    CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
    JSON.stringify({
      id: String(botMessage._id),
      conversationId,
      tenantId,
      senderType: 'BOT',
      senderName: 'Assistente Virtual',
      senderId: null,
      text: explanationText,
      type: 'TEXT',
      status: 'PENDING',
      externalId: null,
      createdAt:
        botMessage.createdAt?.toISOString() ?? new Date().toISOString(),
    })
  )

  await escalateToHuman(conversationId, tenantId, pubsubClient)

  return {
    claimCreated: false,
    dataSaved: true,
    message: json.data.message,
  }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @app/chat-worker exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```
fix: send explanatory BOT message before escalation in reportClaim (BUG-005)
```

---

## Task 5: BONUS — Return proposalId from captureLead tool (P2)

**Files:**

- Modify: `apps/chat-worker/src/tools/capture-lead.ts:82-86`

**Problem:** `captureLead` returns `{ success, message, data }` where `data` is the raw API response. The AI cannot extract `proposalId` from this opaque blob to pass to `collectInsuredAssetData`, breaking the captureLead -> collectInsuredAssetData flow.

- [ ] **Step 1: Extract and return proposalId in `capture-lead.ts`**

Replace lines 82-86 with:

```typescript
const json: unknown = await response.json()

let proposalId: string | null = null
if (
  typeof json === 'object' &&
  json !== null &&
  'data' in json &&
  typeof (json as { data: unknown }).data === 'object' &&
  (json as { data: unknown }).data !== null
) {
  const respData = (json as { data: Record<string, unknown> }).data
  if (typeof respData['proposalId'] === 'string') {
    proposalId = respData['proposalId']
  }
}

return {
  success: true,
  proposalId,
  message: proposalId
    ? `Proposta ${proposalId} registrada com sucesso para ${clientName} - ${insuranceType}`
    : `Proposta registrada com sucesso para ${clientName} - ${insuranceType}`,
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @app/chat-worker exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```
fix: return proposalId from captureLead for collectInsuredAssetData flow
```

---

## Task 6: BUG-003 — Support wildcard `*` in allowedOrigins (P3)

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/widget-helpers.ts:73-80`

**Problem:** `isValidOrigin()` uses exact string comparison. Configuring `allowedOrigins: ["*"]` doesn't work as a wildcard. Only support literal `*` (allow all), not glob patterns (avoid regex injection).

- [ ] **Step 1: Add wildcard support to `isValidOrigin`**

Replace the function at lines 73-80:

```typescript
export function isValidOrigin(
  allowedOrigins: readonly string[],
  requestOrigin: string | undefined
): boolean {
  if (!requestOrigin) return false
  if (allowedOrigins.length === 0) return false
  return allowedOrigins.some(
    (origin) => origin === '*' || requestOrigin === origin
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @app/chat-server exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```
fix: support wildcard '*' in allowedOrigins for widget origin validation (BUG-003)
```

---

## Task 7: BUG-006 — Strip country code prefix from phone input (P3)

**Files:**

- Modify: `apps/widget/src/components/pre-chat-form-styles.ts:24-34`

**Problem:** If user types `+5511987651234` (with country code), `formatBrPhone` strips non-digits to `5511987651234` (13 digits), slices to 11 -> `55119876512`, formats as `(55) 11987-6512`. Server rejects because `55` is not a valid DDD.

**Fix:** Strip leading `55` if digit string starts with it and has more than 11 digits (indicating country code was included).

- [ ] **Step 1: Update `formatBrPhone` and `isValidBrPhone` in `pre-chat-form-styles.ts`**

Replace the two functions (lines 24-34):

```typescript
function stripBrCountryCode(digits: string): string {
  if (digits.length > 11 && digits.startsWith('55')) {
    return digits.slice(2)
  }
  return digits
}

export function formatBrPhone(value: string): string {
  const raw = value.replace(/\D/g, '')
  const digits = stripBrCountryCode(raw).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isValidBrPhone(value: string): boolean {
  const raw = value.replace(/\D/g, '')
  const digits = stripBrCountryCode(raw)
  return digits.length === 10 || digits.length === 11
}
```

- [ ] **Step 2: Verify widget builds**

Run: `pnpm --filter @app/widget build`
Expected: successful Vite build

- [ ] **Step 3: Commit**

```
fix: strip +55 country code prefix from widget phone input (BUG-006)
```

---

## Summary

| Task | Bug     | Priority | Files Changed   | Estimated |
| ---- | ------- | -------- | --------------- | --------- |
| 1    | BUG-004 | P0       | 2 (chat-worker) | 15 min    |
| 2    | BUG-001 | P0       | 1 (widget)      | 10 min    |
| 3    | BUG-002 | P1       | 1 (chat-worker) | 15 min    |
| 4    | BUG-005 | P1       | 1 (chat-worker) | 15 min    |
| 5    | BONUS   | P2       | 1 (chat-worker) | 10 min    |
| 6    | BUG-003 | P3       | 1 (chat-server) | 5 min     |
| 7    | BUG-006 | P3       | 1 (widget)      | 10 min    |

**Total files modified:** 7 files across 3 apps

**Final verification after all tasks:**

```
pnpm lint && pnpm typecheck && pnpm build
```
