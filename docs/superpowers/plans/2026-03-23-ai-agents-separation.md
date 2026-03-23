# AI Agents Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate AI Agent configuration from WhatsApp Channels into an independent entity with its own CRUD routes, settings page, and bidirectional association.

**Architecture:** Independent AI Agents with their own MongoDB model, Fastify CRUD routes, and React feature. Channels reference agents via `aiAgentId`. Chat processor uses two-step lookup (channel -> agent). DDD Light pattern (no use cases/repositories).

**Tech Stack:** MongoDB/Mongoose, Fastify 5, Zod, React 19, TanStack React Query, shadcn/ui, React Hook Form

**Spec:** `docs/superpowers/specs/2026-03-23-ai-agents-separation-design.md`

---

## File Map

### New Files

| File                                                                 | Responsibility                        |
| -------------------------------------------------------------------- | ------------------------------------- |
| `apps/web/src/features/ai-agents/types/index.ts`                     | TypeScript interfaces for AI agents   |
| `apps/web/src/features/ai-agents/lib/schemas.ts`                     | Zod validation schemas for agent form |
| `apps/web/src/features/ai-agents/hooks/use-ai-agents.ts`             | React Query CRUD hooks                |
| `apps/web/src/features/ai-agents/components/ai-agents-page.tsx`      | Main page with 4 UI states            |
| `apps/web/src/features/ai-agents/components/ai-agents-table.tsx`     | Table + skeleton                      |
| `apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx` | Create/edit form sheet                |
| `apps/web/src/features/ai-agents/components/delete-agent-dialog.tsx` | Delete confirmation dialog            |
| `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`          | **REWRITE** - New CRUD routes         |
| `scripts/migrate-ai-agents.ts`                                       | One-time data migration script        |

### Modified Files

| File                                                               | Change                                                   |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/db-chat/src/models/ai-agent.model.ts`                    | Add `name`, `description`; remove `channelId`; new index |
| `packages/db-chat/src/models/channel.model.ts`                     | Add `aiAgentId` field                                    |
| `apps/chat-server/src/infra/http/routes/channel-routes.ts`         | Accept `aiAgentId` in update schema                      |
| `apps/chat-worker/src/processors/ai-bot-processor.ts`              | Two-step agent lookup                                    |
| `apps/web/src/app/(dashboard)/settings/page.tsx`                   | Accept `searchParams`, render section                    |
| `apps/web/src/features/channels/components/settings-layout.tsx`    | Add "Agentes IA" nav, real navigation                    |
| `apps/web/src/features/channels/components/channels-page.tsx`      | Remove AI config state/sheet                             |
| `apps/web/src/features/channels/components/channels-table.tsx`     | Remove "Configurar IA" action                            |
| `apps/web/src/features/channels/components/channel-form-sheet.tsx` | Add AI agent select dropdown                             |
| `apps/web/src/features/channels/hooks/use-channels.ts`             | Remove AI agent hooks, add `aiAgentId` to update         |
| `apps/web/src/features/channels/types/index.ts`                    | Remove AI agent types, add `aiAgentId`                   |
| `apps/web/src/features/channels/lib/schemas.ts`                    | Add `aiAgentId` to channel form                          |
| `apps/web/src/features/chat/types/index.ts`                        | Add `aiAgentId` to `ChannelData`                         |

### Deleted Files

| File                                                                  | Reason                  |
| --------------------------------------------------------------------- | ----------------------- |
| `apps/web/src/features/channels/components/ai-agent-config-sheet.tsx` | Replaced by new feature |

---

## Task 1: Update AiAgent MongoDB Model

**Files:**

- Modify: `packages/db-chat/src/models/ai-agent.model.ts`

- [ ] **Step 1: Update the AiAgent Mongoose schema**

Replace the entire file content:

```typescript
import mongoose, { Schema } from 'mongoose'

const aiAgentSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: null, maxlength: 300 },
    systemPrompt: {
      type: String,
      default:
        'Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro.',
    },
    provider: { type: String, enum: ['claude', 'openai'], default: 'claude' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 500 },
    maxResponsesPerConversation: { type: Number, default: 20 },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
)

aiAgentSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export const AiAgent = mongoose.model('AiAgent', aiAgentSchema)
```

Key changes: removed `channelId`, added `name` (required) and `description` (optional), changed unique index from `(tenantId, channelId)` to `(tenantId, name)`.

- [ ] **Step 2: Commit**

```bash
git add packages/db-chat/src/models/ai-agent.model.ts
git commit -m "refactor(db-chat): update AiAgent model - remove channelId, add name/description"
```

---

## Task 2: Update Channel MongoDB Model

**Files:**

- Modify: `packages/db-chat/src/models/channel.model.ts`

- [ ] **Step 1: Add `aiAgentId` field to Channel schema**

In `channel.model.ts`, add `aiAgentId` field after `aiUserId` (line 17):

```typescript
aiAgentId: { type: String, default: null },
```

The full field block in the schema becomes:

```typescript
aiUserId: String,
aiAgentId: { type: String, default: null },
config: { type: Schema.Types.Mixed, default: {} },
```

- [ ] **Step 2: Commit**

```bash
git add packages/db-chat/src/models/channel.model.ts
git commit -m "feat(db-chat): add aiAgentId field to Channel model"
```

---

## Task 3: Rewrite AI Agent Backend Routes (CRUD)

**Files:**

- Rewrite: `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`

- [ ] **Step 1: Write the new CRUD routes file**

Replace the entire file with new independent CRUD routes. The file exports `aiAgentRoutes(app: FastifyInstance)` (same signature) with 5 endpoints:

- `GET /chat/ai-agents` - List all agents for tenant with linked channel counts (via aggregation)
- `POST /chat/ai-agents` - Create agent, validate unique name per tenant (409 `AGENT_NAME_ALREADY_EXISTS`)
- `GET /chat/ai-agents/:id` - Detail with `linkedChannels` array
- `PUT /chat/ai-agents/:id` - Update, validate name uniqueness on rename
- `DELETE /chat/ai-agents/:id` - Delete, reject if has linked channels (409 `AGENT_HAS_LINKED_CHANNELS` with channel list)

Schemas:

```typescript
const createAgentBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).nullable().optional(),
  systemPrompt: z.string().max(2000).optional(),
  provider: z.enum(['claude', 'openai']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(2000).optional(),
  maxResponsesPerConversation: z.number().min(5).max(100).optional(),
  isActive: z.boolean().optional(),
})
const updateAgentBodySchema = createAgentBodySchema.partial()
```

All routes use `request.organizationId` for tenant isolation. Response pattern: `{ success: true, data }`.

Import both `AiAgent` and `Channel` from `@repo/db-chat`.

The `mapAgent` helper: strips `_id` and `__v`, maps `_id` to `id`.

For the LIST endpoint, use `Channel.aggregate` to get channel counts and names per agent in a single query.

- [ ] **Step 2: Verify app.ts import still works**

The import in `apps/chat-server/src/app.ts` line 14 already imports `aiAgentRoutes` from this file. Same export name, no change needed.

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/ai-agent-routes.ts
git commit -m "feat(chat-server): rewrite AI agent routes as independent CRUD"
```

---

## Task 4: Update Channel Routes to Accept `aiAgentId`

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/channel-routes.ts`

- [ ] **Step 1: Add `AiAgent` import**

At line 5, change to: `import { Channel, AiAgent } from '@repo/db-chat'`

- [ ] **Step 2: Add `aiAgentId` to `updateChannelBodySchema`**

At line 19-24, add: `aiAgentId: z.string().nullable().optional(),`

- [ ] **Step 3: Add validation in the PUT handler**

In the PUT `/chat/channels/:id` handler (line 92-118), before the `findOneAndUpdate` call, add:

```typescript
if (body.aiAgentId) {
  const agent = await AiAgent.findOne({ _id: body.aiAgentId, tenantId })
    .lean()
    .exec()
  if (!agent) {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'AI_AGENT_NOT_FOUND',
        message: 'Agente de IA nao encontrado',
      },
    })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/channel-routes.ts
git commit -m "feat(chat-server): accept aiAgentId in channel update route"
```

---

## Task 5: Update Chat Processor (Two-Step Lookup)

**Files:**

- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts`

- [ ] **Step 1: Replace the agent lookup logic**

In `ai-bot-processor.ts`, replace lines 32-42 (single-query lookup) with two-step lookup:

```typescript
const channelId = String(conversation.channelId)

// Step 1: Get channel to find aiAgentId
const channel = await Channel.findOne({ _id: channelId, tenantId })
  .lean()
  .exec()
if (!channel?.aiAgentId) {
  await escalateToHuman(conversationId, tenantId, pubsubClient)
  logger.info(
    { conversationId, tenantId },
    'No AI agent configured for channel, escalated to human'
  )
  return
}

// Step 2: Get agent by id
const aiAgent = await AiAgent.findOne({ _id: channel.aiAgentId, tenantId })
  .lean()
  .exec()
if (!aiAgent || !aiAgent.isActive) {
  await escalateToHuman(conversationId, tenantId, pubsubClient)
  logger.info(
    { conversationId, tenantId },
    'No active AI agent, escalated to human'
  )
  return
}
```

Note: `Channel` import already exists at line 4.

- [ ] **Step 2: Optimize channel fetch below**

At line 64-71, the processor fetches the channel again. Since we already have it from step 1, replace the `Promise.all` to only fetch messages:

```typescript
const recentMessages = await Message.find({ conversationId })
  .sort({ createdAt: -1 })
  .limit(10)
  .lean()
  .exec()
```

The `channel` variable from the lookup above is already in scope — `channelName` reference (line 73-74) continues to work.

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/processors/ai-bot-processor.ts
git commit -m "refactor(chat-worker): two-step AI agent lookup via channel.aiAgentId"
```

---

## Task 6: Frontend - AI Agents Types and Schemas

**Files:**

- Create: `apps/web/src/features/ai-agents/types/index.ts`
- Create: `apps/web/src/features/ai-agents/lib/schemas.ts`

- [ ] **Step 1: Create types file**

Interfaces: `AiAgentData` (list item with `linkedChannelCount`), `AiAgentDetail` (extends with `linkedChannels` array), `CreateAiAgentPayload`, `UpdateAiAgentPayload`.

All fields `readonly`. See spec section 7 for exact field definitions.

- [ ] **Step 2: Create schemas file**

Zod schema `aiAgentFormSchema` with all form fields. Use `z.coerce.number()` for numeric inputs (HTML forms return strings).

Export `AiAgentFormValues` type and `DEFAULT_AGENT_FORM` constant.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/ai-agents/types/index.ts apps/web/src/features/ai-agents/lib/schemas.ts
git commit -m "feat(web): add AI agents types and Zod schemas"
```

---

## Task 7: Frontend - AI Agents React Query Hooks

**Files:**

- Create: `apps/web/src/features/ai-agents/hooks/use-ai-agents.ts`

- [ ] **Step 1: Create hooks file**

Follow pattern from `use-channels.ts`. Use `chatApi` from `@/features/chat/lib/chat-api`.

Hooks: `useAiAgents()`, `useAiAgent(id)`, `useCreateAiAgent()`, `useUpdateAiAgent()`, `useDeleteAiAgent()`.

Cache key: `'ai-agents'`. staleTime: 60_000. Toast on success/error via `sonner`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/ai-agents/hooks/use-ai-agents.ts
git commit -m "feat(web): add AI agents React Query hooks"
```

---

## Task 8: Frontend - AI Agents Table Component

**Files:**

- Create: `apps/web/src/features/ai-agents/components/ai-agents-table.tsx`

- [ ] **Step 1: Create table component**

Follow pattern from `channels-table.tsx`. Columns: Nome (with description subtitle), Provider (badge), Status (badge Ativo/Inativo), Canais (count text), Acoes (dropdown: Editar, Duplicar, Excluir).

Export `AiAgentsTable` and `AiAgentsTableSkeleton` (3 skeleton rows).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/ai-agents/components/ai-agents-table.tsx
git commit -m "feat(web): add AI agents table component"
```

---

## Task 9: Frontend - AI Agent Form Sheet

**Files:**

- Create: `apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx`

- [ ] **Step 1: Create form sheet**

Follow pattern from `channel-form-sheet.tsx`. Props: `open`, `onOpenChange`, `agent?` (AiAgentData).

Fields: Nome (Input), Descricao (Input), System Prompt (Textarea), Provider (Select), Temperature (number Input), Max Tokens (number Input), Max Respostas (number Input), Ativo (Switch toggle).

In edit mode, show "Canais vinculados" section with badges (from `useAiAgent(id)` detail).

For duplicate flow: the page passes an agent with `id: ''` and modified name - the form treats `id: ''` as create mode.

Include local `FormField` helper (same pattern as channel-form-sheet).

**Max 200 lines rule:** Both this file and `channel-form-sheet.tsx` (already 256 lines) use a `FormField` helper. Extract `FormField` to a shared component at `apps/web/src/components/ui/form-field.tsx` FIRST, then import it in both files. This satisfies the 200-line limit in CLAUDE.md and avoids duplication.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx
git commit -m "feat(web): add AI agent form sheet component"
```

---

## Task 10: Frontend - Delete Agent Dialog

**Files:**

- Create: `apps/web/src/features/ai-agents/components/delete-agent-dialog.tsx`

- [ ] **Step 1: Create delete dialog**

Follow pattern from `deactivate-channel-dialog.tsx`. Show warning if agent has linked channels (block delete, show count). Otherwise show confirmation with destructive button.

Uses `useDeleteAiAgent()` hook. On success, closes dialog.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/ai-agents/components/delete-agent-dialog.tsx
git commit -m "feat(web): add delete agent confirmation dialog"
```

---

## Task 11: Frontend - AI Agents Page (4 UI States)

**Files:**

- Create: `apps/web/src/features/ai-agents/components/ai-agents-page.tsx`

- [ ] **Step 1: Create main page**

Follow pattern from `channels-page.tsx`. 4 states: Loading (skeleton), Error (alert + retry), Empty (Brain icon + CTA), Success (table).

State management: `formOpen`, `editingAgent`, `deleteAgent`. Callbacks: `handleCreate`, `handleEdit`, `handleDuplicate` (sets agent with modified name + empty id), `handleDelete`.

Renders: `AiAgentFormSheet`, `DeleteAgentDialog`, content area with table or state.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/ai-agents/components/ai-agents-page.tsx
git commit -m "feat(web): add AI agents page with 4 UI states"
```

---

## Task 12: Frontend - Settings Navigation with searchParams

**Files:**

- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`
- Modify: `apps/web/src/features/channels/components/settings-layout.tsx`

- [ ] **Step 1: Update settings page to read searchParams**

Replace settings page to accept `searchParams` (Next.js App Router server component prop). Read `section` param, default to `'canais'`. Render `AiAgentsPage` or `ChannelsPage` based on section. Pass `activeSection` to `SettingsLayout`.

```typescript
import { AiAgentsPage } from '@/features/ai-agents/components/ai-agents-page'
import { ChannelsPage } from '@/features/channels/components/channels-page'
import { SettingsLayout } from '@/features/channels/components/settings-layout'

interface SettingsPageProps {
  searchParams: Promise<{ section?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams
  const section = params.section ?? 'canais'

  return (
    <SettingsLayout activeSection={section}>
      {section === 'agentes-ia' ? <AiAgentsPage /> : <ChannelsPage />}
    </SettingsLayout>
  )
}
```

- [ ] **Step 2: Update SettingsLayout for real navigation**

Add `'agentes-ia'` to the `SettingsSection` union type. Add `Brain` icon import from lucide-react. Add `href` to each section item. Accept `activeSection` prop instead of hardcoded `'canais'`.

Replace `<button>` elements with `<Link>` from `next/link` for enabled items. Disabled items remain as `<span>`.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/settings/page.tsx" apps/web/src/features/channels/components/settings-layout.tsx
git commit -m "feat(web): add settings navigation with searchParams and Agentes IA section"
```

---

## Task 13: Frontend - Clean Up Channels Feature (Remove AI Config)

**Files:**

- Modify: `apps/web/src/features/channels/components/channels-page.tsx`
- Modify: `apps/web/src/features/channels/components/channels-table.tsx`
- Modify: `apps/web/src/features/channels/hooks/use-channels.ts`
- Modify: `apps/web/src/features/channels/types/index.ts`
- Delete: `apps/web/src/features/channels/components/ai-agent-config-sheet.tsx`

- [ ] **Step 1: Remove AI agent types from channels/types/index.ts**

Remove `AiAgentConfig` interface (lines 32-42) and `UpdateAiAgentPayload` interface (lines 44-51). Add `aiAgentId?: string | null` to `UpdateChannelPayload`.

- [ ] **Step 2: Remove AI agent hooks from use-channels.ts**

Remove `AI_AGENT_KEY` constant (line 17), `useAiAgentConfig` (lines 96-108), `useUpdateAiAgent` (lines 110-137). Remove `AiAgentConfig` and `UpdateAiAgentPayload` from type imports.

- [ ] **Step 3: Remove "Configurar IA" from channels-table.tsx**

Remove `Brain` import, `onConfigureAi` from both interfaces and destructured props, and the `<DropdownMenuItem>` for "Configurar IA" (lines 111-114).

- [ ] **Step 4: Remove AI config state from channels-page.tsx**

Remove: `AiAgentConfigSheet` import, `aiConfigChannelId` state, `handleConfigureAi` callback, `onConfigureAi` prop from ChannelsContent, `<AiAgentConfigSheet>` JSX, `onConfigureAi` from ChannelsContentProps interface and ChannelsContent destructured props, `onConfigureAi` from `<ChannelsTable>`.

- [ ] **Step 5: Delete ai-agent-config-sheet.tsx**

```bash
rm apps/web/src/features/channels/components/ai-agent-config-sheet.tsx
```

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/src/features/channels/
git commit -m "refactor(web): remove AI config from channels feature"
```

---

## Task 14: Frontend - Add AI Agent Dropdown to Channel Form

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-form-sheet.tsx`
- Modify: `apps/web/src/features/channels/lib/schemas.ts`
- Modify: `apps/web/src/features/chat/types/index.ts`

- [ ] **Step 1: Add `aiAgentId` to ChannelData**

In `apps/web/src/features/chat/types/index.ts`, add `readonly aiAgentId: string | null` to `ChannelData` interface.

- [ ] **Step 2: Add `aiAgentId` to channel form schema**

In `apps/web/src/features/channels/lib/schemas.ts`, add `aiAgentId: z.string().nullable().optional()` to the schema object and `aiAgentId: null` to `EMPTY_CHANNEL_FORM`.

- [ ] **Step 3: Add AI agent select to channel-form-sheet.tsx**

Changes:

1. Import `useAiAgents` from `@/features/ai-agents/hooks/use-ai-agents`
2. Import `Badge` from `@/components/ui/badge`
3. Call `const { data: aiAgents } = useAiAgents()` in the component
4. In form reset for edit mode, include `aiAgentId: channel.aiAgentId ?? null`
5. In handleSubmit for edit mode, include `aiAgentId: values.aiAgentId` in update payload
6. Add a `<FormField label="Agente de IA">` with `<Controller>` + `<Select>` showing "Nenhum" + list of agents with active/inactive badge. Show only in edit mode (`{isEditMode && ...}`).

Map "Nenhum" selection to `null`: `onValueChange={(v) => field.onChange(v === 'none' ? null : v)}`

**Why edit-only:** A channel must exist before it can be associated with an agent. During creation, the channel has no `id` yet, so the association is meaningless.

**200-line limit:** `channel-form-sheet.tsx` is already 256 lines. Before adding the dropdown, extract `FormField` to `apps/web/src/components/ui/form-field.tsx` (see Task 9 note). This brings the file under 200 lines and makes room for the new field.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/channels/components/channel-form-sheet.tsx apps/web/src/features/channels/lib/schemas.ts apps/web/src/features/chat/types/index.ts
git commit -m "feat(web): add AI agent dropdown to channel edit form"
```

---

## Task 15: Data Migration Script

**Files:**

- Create: `scripts/migrate-ai-agents.ts`

- [ ] **Step 1: Create migration script**

Three sequential steps:

1. Generate unique `name` for each existing AiAgent based on linked channel name. Handle orphans (`"Agente orfao - {id prefix}"`) and duplicates (append counter suffix).
2. For each AiAgent with `channelId`, set `channel.aiAgentId = agent._id`. Skip if already set (idempotent). Stop if any link fails.
3. `$unset` channelId from all agents. Drop old index. Create new unique index.

Uses raw mongoose collections (`db.collection('aiagents')`) for direct manipulation.

Run with: `npx tsx scripts/migrate-ai-agents.ts`

Requires `MONGODB_URL` env var.

**Logging:** Use `console.info`/`console.error` in this script since it is a one-time CLI migration, not application code. Pino is not required for scripts.

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-ai-agents.ts
git commit -m "feat(scripts): add AI agents separation migration script"
```

---

## Task 16: Verify Build and Smoke Test

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: zero errors

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: successful build

- [ ] **Step 4: Fix any issues**

Common issues: missing imports after deletions, type mismatches, unused imports.

- [ ] **Step 5: Final commit if needed**

```bash
git add -A
git commit -m "chore: fix build issues from AI agents separation"
```

---

## Task Summary

| Task | Description                                 | Effort |
| ---- | ------------------------------------------- | ------ |
| 1    | Update AiAgent MongoDB model                | Small  |
| 2    | Update Channel MongoDB model                | Small  |
| 3    | Rewrite AI agent CRUD routes                | Medium |
| 4    | Update channel routes (aiAgentId)           | Small  |
| 5    | Update chat processor (two-step lookup)     | Small  |
| 6    | Frontend: AI agents types + schemas         | Small  |
| 7    | Frontend: AI agents React Query hooks       | Small  |
| 8    | Frontend: AI agents table component         | Medium |
| 9    | Frontend: AI agent form sheet               | Medium |
| 10   | Frontend: Delete agent dialog               | Small  |
| 11   | Frontend: AI agents page (4 states)         | Medium |
| 12   | Frontend: Settings navigation               | Medium |
| 13   | Frontend: Clean up channels feature         | Medium |
| 14   | Frontend: AI agent dropdown in channel form | Medium |
| 15   | Data migration script                       | Medium |
| 16   | Verify build and smoke test                 | Small  |

**Dependency order:**

- **Sequential:** Tasks 1-2 (models) -> Tasks 3-4 (routes) -> Task 5 (processor)
- **Parallel group A:** Tasks 6+7 (types, schemas, hooks) — no dependencies on each other
- **Parallel group B (after A):** Tasks 8, 9, 10 (table, form, dialog) — depend on types+hooks from A
- **Sequential (after B):** Task 11 (page) -> Task 12 (navigation) -> Task 13 (cleanup) -> Task 14 (channel dropdown)
- **Final:** Task 15 (migration) -> Task 16 (verify)
