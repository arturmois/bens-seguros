# Chat Module Follow-up Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 4 remaining code review findings: unread counts system, conditional "Voltar para IA" button, tenant name in AI system prompt, and component size violations.

**Architecture:** Backend-first (unread counts endpoint, system prompt fix), then frontend (button visibility, unread badge, component splits). Each task produces a working commit.

**Tech Stack:** TypeScript 5.9, Fastify, Mongoose, Next.js 16, React 19, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-23-chat-module-fixes-design.md` (sections 5.10, 5.2, 6.2, 1.3)

---

## Task 1: Unread Counts — Backend (Repository + Route)

**Files:**

- Modify: `apps/chat-server/src/domain/ports/unread-repository.ts`
- Modify: `apps/chat-server/src/infra/repository/mongoose-unread-repository.ts`
- Modify: `apps/chat-server/src/infra/http/routes/conversation-routes.ts`

- [ ] **Step 1:** Read the current port (`unread-repository.ts`), repository implementation (`mongoose-unread-repository.ts`), and model (`packages/db-chat/src/models/unread-count.model.ts`)

- [ ] **Step 2:** Add `getUnreadCounts(tenantId, userId)` and `increment(tenantId, conversationId, excludeUserId)` to the port interface

`getUnreadCounts` returns `ReadonlyArray<{ conversationId: string; count: number }>` — all conversations with unread > 0 for a user.
`increment` bumps count for all users in that conversation except `excludeUserId` (the sender).

- [ ] **Step 3:** Implement both methods in `mongoose-unread-repository.ts`

`getUnreadCounts`: `UnreadCount.find({ tenantId, userId, count: { $gt: 0 } })` with projection `{ conversationId: 1, count: 1, _id: 0 }`.
`increment`: `UnreadCount.updateMany({ tenantId, conversationId, userId: { $ne: excludeUserId } }, { $inc: { count: 1 } })`.

- [ ] **Step 4:** Add `GET /chat/conversations/unread-counts` route in `conversation-routes.ts`

Place BEFORE the `/:id` route to avoid matching as an id param. Resolves `UnreadRepository` from DI, calls `getUnreadCounts`, returns `{ success: true, data: Record<conversationId, number> }`.

- [ ] **Step 5:** Verify typecheck: `pnpm --filter chat-server typecheck`

- [ ] **Step 6:** Commit: `feat(chat-server): add unread counts repository methods and GET endpoint`

---

## Task 2: Unread Counts — Frontend (Hook + Badge)

**Files:**

- Create: `apps/web/src/features/chat/hooks/use-unread-counts.ts`
- Modify: `apps/web/src/features/chat/components/conversation-list.tsx`
- Modify: `apps/web/src/features/chat/components/chat-layout.tsx`

- [ ] **Step 1:** Create `use-unread-counts.ts`

React Query hook with key `['chat-unread-counts']`, fetches `GET /chat/conversations/unread-counts`, staleTime 60s. Listens to `UNREAD_UPDATE` socket event to invalidate the query.

- [ ] **Step 2:** Add unread badge to `ConversationItem` in `conversation-list.tsx`

Accept `unreadCount` prop. Render a small numeric badge (circular, `bg-primary text-primary-foreground`, min-w-5 h-5, rounded-full) next to the timestamp when count > 0. Show `99+` for counts above 99.

- [ ] **Step 3:** Wire `useUnreadCounts(socket)` in `chat-layout.tsx`

Call the hook, pass `unreadCounts` to `ConversationList`. In the list, look up `unreadCounts[conversation.id] ?? 0` for each item.

- [ ] **Step 4:** Verify typecheck: `pnpm --filter web typecheck`

- [ ] **Step 5:** Commit: `feat(web): unread count badge on conversation list`

---

## Task 3: Conditional "Voltar para IA" Button

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/conversation-routes.ts` (GET /:id response)
- Modify: `apps/web/src/features/chat/types/index.ts`
- Modify: `apps/web/src/features/chat/components/chat-header.tsx`

- [ ] **Step 1:** Enrich conversation detail response with `hasAiAgent`

In the `GET /chat/conversations/:id` handler, after loading the conversation, query `AiAgent.findOne({ tenantId, channelId: conversation.channelId, isActive: true })`. Include `hasAiAgent: Boolean(aiAgent)` in the response.

- [ ] **Step 2:** Add `hasAiAgent?: boolean` to `ConversationData` in frontend types

- [ ] **Step 3:** Conditionally render "Voltar para IA" in `chat-header.tsx`

Wrap the dropdown item: `{conversation.hasAiAgent && (<DropdownMenuItem ...>Voltar para IA</DropdownMenuItem>)}`

- [ ] **Step 4:** Verify typecheck: `pnpm --filter chat-server typecheck` and `pnpm --filter web typecheck`

- [ ] **Step 5:** Commit: `fix(web): only show Voltar para IA when channel has active AI agent`

---

## Task 4: Tenant Name in AI System Prompt

**Files:**

- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts`

- [ ] **Step 1:** Read the current `buildSystemPrompt` function and the Channel model

The Channel model has `name` field (e.g., "WhatsApp Principal"). Use this as the closest proxy for tenant/channel context. The channel is already loaded later in the processor — move the query earlier.

- [ ] **Step 2:** Update `buildSystemPrompt` signature to accept `channelName`

```typescript
function buildSystemPrompt(
  contactName: string,
  channelName: string,
  customPrompt?: string
): string
```

Add channel context to the prompt: `Voce esta atendendo pelo canal: ${channelName}`

- [ ] **Step 3:** Move the Channel query before the AI call and pass `channel.name`

The processor currently loads the channel AFTER the AI call (for the sendMessage queue). Move it before `buildSystemPrompt` or do a separate lean query earlier.

- [ ] **Step 4:** Verify typecheck: `pnpm --filter chat-worker typecheck`

- [ ] **Step 5:** Commit: `fix(chat-worker): include channel name in AI system prompt`

---

## Task 5: Split Oversized Components (200-line limit)

**Files:**

- Modify: `apps/web/src/features/chat/components/chat-header.tsx` (235 lines)
- Modify: `apps/web/src/features/chat/components/chat-area.tsx` (234 lines)
- Modify: `apps/web/src/features/chat/components/chat-layout.tsx` (245 lines)
- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts` (282 lines)

- [ ] **Step 1:** Extract `HeaderActions` from `chat-header.tsx`

Create `apps/web/src/features/chat/components/header-actions.tsx` with the `HeaderActions` sub-component (~100 lines including the AlertDialog and dropdown). Import it in `chat-header.tsx`.

- [ ] **Step 2:** Extract `MessageInput` and state components from `chat-area.tsx`

Create `apps/web/src/features/chat/components/message-input.tsx` with the `MessageInput` form component. Create `apps/web/src/features/chat/components/chat-area-states.tsx` with `MessagesLoading`, `MessagesError`, `EmptyState`.

- [ ] **Step 3:** Extract layout variants from `chat-layout.tsx`

Create `apps/web/src/features/chat/components/chat-desktop-layout.tsx` and `apps/web/src/features/chat/components/chat-mobile-layout.tsx`. Each receives the same props and renders the responsive layout. Main `chat-layout.tsx` handles state + context and delegates to the appropriate layout.

- [ ] **Step 4:** Extract helpers from `ai-bot-processor.ts`

Create `apps/chat-worker/src/processors/ai-bot-helpers.ts` with: `getAiAgentConfig`, `buildConversationMessages`, `buildSystemPrompt`, `escalateToHuman`. Main processor imports and uses them.

- [ ] **Step 5:** Verify all files are under 200 lines

```bash
wc -l <each file>
```

- [ ] **Step 6:** Verify typecheck + tests: `pnpm typecheck` and `pnpm test`

- [ ] **Step 7:** Commit: `refactor: split oversized components to comply with 200-line limit`

---

## Task 6: Final Verification

- [ ] **Step 1:** `pnpm lint`
- [ ] **Step 2:** `pnpm typecheck`
- [ ] **Step 3:** `pnpm test`
- [ ] **Step 4:** `pnpm build`
- [ ] **Step 5:** Fix any issues and commit
