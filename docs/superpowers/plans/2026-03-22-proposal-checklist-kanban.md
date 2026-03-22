# Proposal Checklist + Kanban Board - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stage-specific checklists to proposals (with advance-blocking validation) and a Kanban board view for the proposal pipeline.

**Architecture:** Checklist config is defined as constants behind a `ChecklistConfigProvider` interface (swappable later). Items are created per stage+branch when a proposal is created or advanced. The Kanban board reuses existing `ListProposals` API with `@dnd-kit` for drag-and-drop stage transitions.

**Tech Stack:** Prisma (existing ProposalChecklistItem model), @dnd-kit/core + @dnd-kit/sortable, React Query, existing shadcn/ui components.

**Spec:** `docs/superpowers/specs/2026-03-22-proposal-checklist-kanban-design.md`

---

## File Structure

```
packages/core/src/modules/proposal/
├── domain/
│   ├── checklist-config.ts              # ChecklistConfigProvider interface + constants
│   ├── checklist-repository.ts          # ChecklistRepository interface
│   ├── proposal-errors.ts               # Add ChecklistIncompleteError
│   └── proposal.ts                      # No changes
├── application/
│   ├── initialize-checklist.ts          # Creates items for stage+branch
│   ├── list-checklist-items.ts          # Lists items + summary
│   ├── toggle-checklist-item.ts         # Manual toggle
│   ├── complete-checklist-by-attachment.ts  # Auto-complete via doc upload
│   ├── advance-proposal-stage.ts        # Modify: add checklist validation
│   └── create-proposal.ts              # Modify: initialize checklist
├── infrastructure/
│   └── prisma-checklist-repository.ts   # Prisma implementation
└── index.ts                             # Add new exports

apps/server/src/
├── routes/v1/proposal-routes.ts         # Add 3 checklist sub-routes
├── schemas/proposal.schemas.ts          # Add checklist schemas
└── container-registrations.ts           # Register checklist use cases

apps/web/src/features/proposals/
├── types/index.ts                       # Add ChecklistItem, ChecklistSummary
├── hooks/
│   ├── use-checklist.ts                 # Checklist hooks
│   └── use-kanban-proposals.ts          # Kanban data hook
├── components/
│   ├── proposal-checklist-panel.tsx      # Checklist sidebar panel
│   ├── proposal-detail.tsx              # Modify: add checklist tab + advance guard
│   ├── proposals-content.tsx            # Modify: add view mode toggle
│   ├── proposal-kanban.tsx              # Kanban board (main)
│   ├── kanban-column.tsx                # Kanban column
│   ├── kanban-card.tsx                  # Kanban card
│   └── kanban-card-detail.tsx           # Card detail dialog
```

---

## Task 1: Checklist Config + Domain

**Files:**

- Create: `packages/core/src/modules/proposal/domain/checklist-config.ts`
- Create: `packages/core/src/modules/proposal/domain/checklist-repository.ts`
- Modify: `packages/core/src/modules/proposal/domain/proposal-errors.ts`

- [ ] **Step 1: Create ChecklistConfigProvider interface + constants**

```ts
// packages/core/src/modules/proposal/domain/checklist-config.ts
import type { Stage, Branch } from './proposal.js'

export interface ChecklistItemConfig {
  readonly itemKey: string
  readonly label: string
  readonly isRequired: boolean
  readonly documentType?: string
}

export interface ChecklistConfigProvider {
  getItems(stage: Stage, branch: Branch): readonly ChecklistItemConfig[]
}

const BASE_ITEMS: Partial<Record<Stage, readonly ChecklistItemConfig[]>> = {
  CAPTURE: [
    {
      itemKey: 'client_data',
      label: 'Dados do cliente preenchidos',
      isRequired: true,
    },
  ],
  QUOTE: [
    {
      itemKey: 'quote_sent',
      label: 'Cotacao enviada ao cliente',
      isRequired: true,
    },
    {
      itemKey: 'quote_approved',
      label: 'Cotacao aprovada pelo cliente',
      isRequired: true,
    },
  ],
  PROTOCOL: [
    {
      itemKey: 'protocol_registered',
      label: 'Proposta protocolada na seguradora',
      isRequired: true,
    },
  ],
  INSPECTION: [
    {
      itemKey: 'inspection_done',
      label: 'Inspecao/vistoria realizada',
      isRequired: true,
    },
  ],
  PAYMENT: [
    {
      itemKey: 'payment_confirmed',
      label: 'Pagamento confirmado',
      isRequired: true,
    },
  ],
}

const BRANCH_EXTRAS: Partial<
  Record<Branch, Partial<Record<Stage, readonly ChecklistItemConfig[]>>>
> = {
  AUTO: {
    CAPTURE: [
      {
        itemKey: 'driver_license',
        label: 'CNH do condutor',
        isRequired: true,
        documentType: 'DRIVER_LICENSE',
      },
      {
        itemKey: 'vehicle_registration',
        label: 'CRLV do veiculo',
        isRequired: true,
        documentType: 'VEHICLE_REGISTRATION',
      },
      {
        itemKey: 'vehicle_photos',
        label: 'Fotos do veiculo',
        isRequired: false,
      },
    ],
    INSPECTION: [
      {
        itemKey: 'inspection_report',
        label: 'Laudo de vistoria',
        isRequired: true,
        documentType: 'INSPECTION_REPORT',
      },
    ],
  },
  LIFE: {
    CAPTURE: [
      {
        itemKey: 'health_declaration',
        label: 'Declaracao de saude',
        isRequired: true,
        documentType: 'HEALTH_DECLARATION',
      },
    ],
  },
  RESIDENTIAL: {
    CAPTURE: [
      {
        itemKey: 'proof_of_address',
        label: 'Comprovante de residencia',
        isRequired: true,
        documentType: 'PROOF_OF_ADDRESS',
      },
    ],
  },
  BUSINESS: {
    CAPTURE: [
      {
        itemKey: 'social_contract',
        label: 'Contrato social',
        isRequired: true,
        documentType: 'SOCIAL_CONTRACT',
      },
      {
        itemKey: 'cnpj_card',
        label: 'Cartao CNPJ',
        isRequired: true,
        documentType: 'CNPJ_CARD',
      },
    ],
  },
}

export class StaticChecklistConfig implements ChecklistConfigProvider {
  getItems(stage: Stage, branch: Branch): readonly ChecklistItemConfig[] {
    const base = BASE_ITEMS[stage] ?? []
    const extras = BRANCH_EXTRAS[branch]?.[stage] ?? []
    return [...base, ...extras]
  }
}
```

- [ ] **Step 2: Create ChecklistRepository interface**

```ts
// packages/core/src/modules/proposal/domain/checklist-repository.ts
export interface ChecklistItemData {
  readonly id: string
  readonly proposalId: string
  readonly itemKey: string
  readonly label: string
  readonly isRequired: boolean
  readonly isCompleted: boolean
  readonly completedAt: Date | null
  readonly completedBy: string | null
  readonly createdAt: Date
}

export interface ChecklistSummary {
  readonly total: number
  readonly completed: number
  readonly required: number
  readonly requiredCompleted: number
  readonly canAdvance: boolean
}

export interface ChecklistRepository {
  createMany(
    proposalId: string,
    items: Array<{ itemKey: string; label: string; isRequired: boolean }>
  ): Promise<void>
  findByProposal(proposalId: string): Promise<ChecklistItemData[]>
  findById(id: string, proposalId: string): Promise<ChecklistItemData | null>
  toggle(
    id: string,
    proposalId: string,
    userId: string
  ): Promise<ChecklistItemData>
  complete(
    id: string,
    proposalId: string,
    userId: string
  ): Promise<ChecklistItemData>
  getSummary(proposalId: string): Promise<ChecklistSummary>
  getSummaryForStage(
    proposalId: string,
    stage: string
  ): Promise<ChecklistSummary>
}
```

- [ ] **Step 3: Add ChecklistIncompleteError to proposal-errors.ts**

```ts
export class ChecklistIncompleteError extends Error {
  readonly code = 'CHECKLIST_INCOMPLETE' as const
  constructor(proposalId: string, pendingCount: number) {
    super(`Checklist incompleto: ${pendingCount} itens obrigatorios pendentes (proposta ${proposalId})`)
    this.name = 'ChecklistIncompleteError'
  }
}

// Add to ProposalErrors factory:
checklistIncomplete: (id: string, pending: number) => new ChecklistIncompleteError(id, pending),
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add checklist config provider, repository interface, and error"
```

---

## Task 2: Checklist Use Cases

**Files:**

- Create: `packages/core/src/modules/proposal/application/initialize-checklist.ts`
- Create: `packages/core/src/modules/proposal/application/list-checklist-items.ts`
- Create: `packages/core/src/modules/proposal/application/toggle-checklist-item.ts`
- Create: `packages/core/src/modules/proposal/application/complete-checklist-by-attachment.ts`

- [ ] **Step 1: InitializeChecklist** — creates checklist items for a given stage+branch

- [ ] **Step 2: ListChecklistItems** — returns items grouped by stage + summary

- [ ] **Step 3: ToggleChecklistItem** — flips isCompleted, sets/clears completedAt and completedBy

- [ ] **Step 4: CompleteChecklistByAttachment** — marks item as completed (called after document upload for items with documentType)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add checklist use cases (initialize, list, toggle, complete-by-attachment)"
```

---

## Task 3: Checklist Infrastructure + Integrate into Advance/Create

**Files:**

- Create: `packages/core/src/modules/proposal/infrastructure/prisma-checklist-repository.ts`
- Modify: `packages/core/src/modules/proposal/application/advance-proposal-stage.ts`
- Modify: `packages/core/src/modules/proposal/application/create-proposal.ts`
- Modify: `packages/core/src/modules/proposal/index.ts`

- [ ] **Step 1: PrismaChecklistRepository** — implements ChecklistRepository using Prisma

- [ ] **Step 2: Modify AdvanceProposalStage** — inject ChecklistRepository + ChecklistConfigProvider. Before `proposal.advance()`, validate checklist (skip for CAPTURE per FR-006). After advance, initialize checklist for the new stage.

```ts
// After existing details check (line 22-24):
if (proposal.stage !== 'CAPTURE') {
  const summary = await this.checklistRepo.getSummaryForStage(
    proposalId,
    proposal.stage
  )
  if (!summary.canAdvance) {
    throw ProposalErrors.checklistIncomplete(
      proposalId,
      summary.required - summary.requiredCompleted
    )
  }
}

proposal.advance()
await this.proposalRepo.save(proposal)

// Initialize checklist for new stage
const newItems = this.checklistConfig.getItems(proposal.stage, proposal.branch)
if (newItems.length > 0) {
  await this.checklistRepo.createMany(
    proposalId,
    newItems.map((i) => ({
      itemKey: i.itemKey,
      label: i.label,
      isRequired: i.isRequired,
    }))
  )
}
```

- [ ] **Step 3: Modify CreateProposal** — inject ChecklistRepository + ChecklistConfigProvider. After save, initialize checklist for CAPTURE stage.

- [ ] **Step 4: Update index.ts exports** — add all new classes and types

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add prisma checklist repository and integrate into advance/create"
```

---

## Task 4: Checklist API Routes + DI Registration

**Files:**

- Modify: `apps/server/src/routes/v1/proposal-routes.ts`
- Modify: `apps/server/src/schemas/proposal.schemas.ts`
- Modify: `apps/server/src/container-registrations.ts`

- [ ] **Step 1: Add DI registrations** for ChecklistRepository, StaticChecklistConfig, InitializeChecklist, ListChecklistItems, ToggleChecklistItem, CompleteChecklistByAttachment. Update CreateProposal and AdvanceProposalStage factories to inject new deps.

- [ ] **Step 2: Add 3 new routes:**

```
GET  /api/v1/proposals/:id/checklist           -> ListChecklistItems
POST /api/v1/proposals/:id/checklist/:itemId/toggle  -> ToggleChecklistItem
POST /api/v1/proposals/:id/checklist/:itemId/upload  -> CompleteChecklistByAttachment (upload doc + complete)
```

- [ ] **Step 3: Add ChecklistIncompleteError to handleProposalError** (return 422)

- [ ] **Step 4: Run typecheck + lint**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add checklist API routes and DI registration"
```

---

## Task 5: Frontend - Checklist Types + Hook

**Files:**

- Modify: `apps/web/src/features/proposals/types/index.ts`
- Create: `apps/web/src/features/proposals/hooks/use-checklist.ts`

- [ ] **Step 1: Add types**

```ts
export interface ChecklistItem {
  readonly id: string
  readonly proposalId: string
  readonly itemKey: string
  readonly label: string
  readonly isRequired: boolean
  readonly isCompleted: boolean
  readonly completedAt: string | null
  readonly completedBy: string | null
}

export interface ChecklistSummary {
  readonly total: number
  readonly completed: number
  readonly required: number
  readonly requiredCompleted: number
  readonly canAdvance: boolean
}
```

- [ ] **Step 2: Create use-checklist hook** with `useChecklist(proposalId)`, `useToggleChecklistItem()`, `useUploadChecklistDocument()`

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add checklist types and hooks"
```

---

## Task 6: Frontend - Checklist Panel Component

**Files:**

- Create: `apps/web/src/features/proposals/components/proposal-checklist-panel.tsx`
- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx`

- [ ] **Step 1: Create ProposalChecklistPanel** — accordion by stage, checkboxes, upload buttons for doc items, progress bar, "N/N completos" badges. Loading/empty/error states.

- [ ] **Step 2: Integrate into proposal-detail.tsx** — add "Checklist" tab alongside "Documentos". Disable "Avancar Estagio" button when checklist incomplete (using summary.canAdvance). Show tooltip with pending items count.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add checklist panel to proposal detail with advance guard"
```

---

## Task 7: Frontend - Kanban Board

**Files:**

- Create: `apps/web/src/features/proposals/hooks/use-kanban-proposals.ts`
- Create: `apps/web/src/features/proposals/components/proposal-kanban.tsx`
- Create: `apps/web/src/features/proposals/components/kanban-column.tsx`
- Create: `apps/web/src/features/proposals/components/kanban-card.tsx`
- Create: `apps/web/src/features/proposals/components/kanban-card-detail.tsx`
- Modify: `apps/web/src/app/(dashboard)/proposals/proposals-content.tsx`

- [ ] **Step 1: Install @dnd-kit**

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities --filter @app/web
```

- [ ] **Step 2: Create use-kanban-proposals hook** — fetches all proposals (no pagination for kanban), groups by stage, accepts boardType filter.

- [ ] **Step 3: Create kanban-card.tsx** — client name, branch badge, premium, salesperson, checklist progress mini-bar.

- [ ] **Step 4: Create kanban-column.tsx** — @dnd-kit DroppableContainer, column header with stage color dot + count badge, card list.

- [ ] **Step 5: Create proposal-kanban.tsx** — DndContext + SortableContext, BoardType toggle (Novo Seguro / Renovacao), columns layout with horizontal scroll.

- [ ] **Step 6: Create kanban-card-detail.tsx** — Dialog with proposal summary + inline checklist panel + "Ver detalhes" link.

- [ ] **Step 7: Add view mode toggle to proposals-content.tsx** — ToggleGroup "Lista / Kanban", conditional render.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat: add kanban board with dnd-kit drag-and-drop stage transitions"
```

---

## Task 8: Quality Gates

- [ ] **Step 1:** `pnpm lint`
- [ ] **Step 2:** `pnpm typecheck`
- [ ] **Step 3:** `pnpm build`
- [ ] **Step 4:** Playwright QA — verify checklist panel in proposal detail, kanban board loads, drag works
