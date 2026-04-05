# Endorsement Kanban Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Endorsement kanban backed by `Proposal`, created only from active policies, with immutable source-policy linkage, policy context on cards/details, and a dedicated `/endorsements` dashboard entry.

**Architecture:** Extend the existing `Proposal` aggregate instead of creating a second operational flow. The backend will store endorsement-specific metadata on `Proposal`, validate `sourcePolicyId` against `Policy`, expose the new fields through the existing proposal API, and keep the older `Endorsement` module as a historical record flow inside the policy tabs with renamed copy to avoid user confusion.

**Tech Stack:** Prisma, Fastify 5, Zod, TypeScript, React 19, Next.js 16, React Query 5, React Hook Form 7, Orval, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-04-03-endorsement-kanban-design.md`

---

## File Structure

### New Files

| File                                                                                      | Responsibility                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/db/prisma/migrations/<timestamp>_add_endorsement_proposal_fields/migration.sql` | Persist `ENDORSEMENT` board type and endorsement-specific proposal fields |
| `apps/web/src/features/proposals/components/endorsement-proposal-sheet.tsx`               | Short creation sheet launched from active policy detail                   |
| `apps/web/src/app/(dashboard)/endorsements/page.tsx`                                      | Dedicated Endorsements dashboard page                                     |
| `e2e/tests/endorsement-kanban.spec.ts`                                                    | Smoke test for endorsement dashboard + policy entry point                 |

### Modified Files

| File                                                                              | Change                                                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma`                                                | Add `ENDORSEMENT` board type and source-policy fields to `Proposal`        |
| `packages/core/src/modules/proposal/domain/proposal.ts`                           | Add endorsement metadata and start endorsements at `QUOTE`                 |
| `packages/core/src/modules/proposal/domain/proposal.spec.ts`                      | Cover endorsement proposal defaults                                        |
| `packages/core/src/modules/proposal/domain/proposal-errors.ts`                    | Add endorsement source-policy validation errors                            |
| `packages/core/src/modules/proposal/domain/proposal-repository.ts`                | Add list filters for insurer, source policy, and creation date range       |
| `packages/core/src/modules/proposal/application/create-proposal.ts`               | Validate active policy and derive endorsement proposal data                |
| `packages/core/src/modules/proposal/application/create-proposal.spec.ts`          | Cover active-policy validation and snapshot population                     |
| `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`            | Persist and restore endorsement fields                                     |
| `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts` | Filter/query endorsement proposals and include source-policy joins         |
| `apps/server/src/container-registrations.ts`                                      | Inject `PolicyRepository` into `CreateProposal`                            |
| `apps/server/src/routes/v1/proposals/_schemas.ts`                                 | Add `ENDORSEMENT` request/response/query fields                            |
| `apps/web/src/api/endpoints/proposals/proposals.ts`                               | Regenerated proposal API client                                            |
| `apps/web/src/api/endpoints/proposals/proposals.zod.ts`                           | Regenerated proposal Zod schemas                                           |
| `apps/web/src/api/model/*`                                                        | Regenerated proposal models for `ENDORSEMENT` and new fields               |
| `apps/web/src/components/layout/sidebar.tsx`                                      | Add dedicated Endossos nav entry                                           |
| `apps/web/src/features/policies/components/policy-detail.tsx`                     | Add `Criar Endosso` entry point on active policies                         |
| `apps/web/src/features/policies/components/policy-tabs.tsx`                       | Rename existing historical endorsement action to avoid ambiguity           |
| `apps/web/src/features/proposals/lib/constants.ts`                                | Add `ENDORSEMENT` labels and board-specific stage labels                   |
| `apps/web/src/features/proposals/hooks/use-kanban-proposals.ts`                   | Support endorsement filters in query string                                |
| `apps/web/src/features/proposals/components/kanban-parts.tsx`                     | Add locked-board mode and endorsement filter controls                      |
| `apps/web/src/features/proposals/components/proposal-kanban.tsx`                  | Support a dedicated endorsement board with locked config                   |
| `apps/web/src/features/proposals/components/proposals-table.tsx`                  | Keep generic proposal table scoped to proposal/renewal types               |
| `apps/web/src/features/proposals/components/proposals-table-toolbar.tsx`          | Limit board-type dropdown and CTA behavior on the proposal page            |
| `apps/web/src/features/proposals/components/kanban-card.tsx`                      | Show source-policy context for endorsement cards                           |
| `apps/web/src/features/proposals/components/kanban-card-detail.tsx`               | Show source-policy context and links in endorsement details                |
| `apps/web/src/features/proposals/components/proposal-detail.tsx`                  | Show source-policy panel in full proposal detail when board is endorsement |
| `apps/web/src/app/(dashboard)/proposals/proposals-content.tsx`                    | Keep proposal page limited to proposal/renewal board toggles               |

---

## Task 1: Extend Proposal persistence and domain for endorsement metadata

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/prisma/migrations/<timestamp>_add_endorsement_proposal_fields/migration.sql`
- Modify: `packages/core/src/modules/proposal/domain/proposal.ts`
- Modify: `packages/core/src/modules/proposal/domain/proposal.spec.ts`
- Modify: `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`

- [ ] **Step 1: Write the failing domain test**

In `packages/core/src/modules/proposal/domain/proposal.spec.ts`, add:

```typescript
it('creates endorsement proposals at QUOTE with source policy metadata', () => {
  const proposal = Proposal.create({
    organizationId: 'org-1',
    clientId: 'client-1',
    salespersonId: 'user-1',
    branch: 'AUTO',
    boardType: 'ENDORSEMENT',
    sourcePolicyId: 'policy-1',
    endorsementType: 'COVERAGE_CHANGE',
    endorsementReason: 'Adicionar cobertura para vidros',
    sourcePolicySnapshot: {
      policyNumber: 'POL-001',
      clientName: 'Maria Souza',
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2027-02-01T00:00:00.000Z'),
      status: 'ACTIVE',
      insurerId: 'ins-1',
      insurerName: 'Porto',
    },
  })

  expect(proposal.stage).toBe('QUOTE')
  expect(proposal.boardType).toBe('ENDORSEMENT')
  expect(proposal.sourcePolicyId).toBe('policy-1')
  expect(proposal.endorsementType).toBe('COVERAGE_CHANGE')
  expect(proposal.sourcePolicySnapshot?.policyNumber).toBe('POL-001')
})
```

- [ ] **Step 2: Run the domain test to verify it fails**

Run: `pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/proposal.spec.ts`

Expected: FAIL because `ENDORSEMENT`, `sourcePolicyId`, `endorsementType`, `endorsementReason`, and `sourcePolicySnapshot` do not exist on the aggregate yet.

- [ ] **Step 3: Update Prisma schema and Proposal aggregate**

In `packages/db/prisma/schema.prisma`, extend the enum and model:

```prisma
enum ProposalBoardType {
  NEW_INSURANCE
  RENEWAL
  ENDORSEMENT
}

model Proposal {
  // existing fields...
  sourcePolicyId       String?
  endorsementType      String?
  endorsementReason    String?
  sourcePolicySnapshot Json?

  sourcePolicy Policy? @relation("ProposalSourcePolicy", fields: [sourcePolicyId], references: [id])

  @@index([organizationId, sourcePolicyId])
  @@index([organizationId, boardType, createdAt(sort: Desc)])
}

model Policy {
  // existing relations...
  endorsementProposals Proposal[] @relation("ProposalSourcePolicy")
}
```

Create `packages/db/prisma/migrations/<timestamp>_add_endorsement_proposal_fields/migration.sql` with:

```sql
ALTER TYPE "ProposalBoardType" ADD VALUE IF NOT EXISTS 'ENDORSEMENT';

ALTER TABLE "Proposal"
  ADD COLUMN "sourcePolicyId" TEXT,
  ADD COLUMN "endorsementType" TEXT,
  ADD COLUMN "endorsementReason" TEXT,
  ADD COLUMN "sourcePolicySnapshot" JSONB;

CREATE INDEX "Proposal_organizationId_sourcePolicyId_idx"
  ON "Proposal" ("organizationId", "sourcePolicyId");

ALTER TABLE "Proposal"
  ADD CONSTRAINT "Proposal_sourcePolicyId_fkey"
  FOREIGN KEY ("sourcePolicyId") REFERENCES "Policy"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

In `packages/core/src/modules/proposal/domain/proposal.ts`, add endorsement fields and start them at `QUOTE`:

```typescript
type BoardType = 'NEW_INSURANCE' | 'RENEWAL' | 'ENDORSEMENT'

export interface SourcePolicySnapshot {
  policyNumber: string
  clientName: string
  startDate: Date
  endDate: Date
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  insurerId: string | null
  insurerName: string | null
}

export interface ProposalProps {
  // existing fields...
  sourcePolicyId: string | null
  endorsementType: string | null
  endorsementReason: string | null
  sourcePolicySnapshot: SourcePolicySnapshot | null
}

export function isSourcePolicySnapshot(
  value: unknown
): value is SourcePolicySnapshot {
  return typeof value === 'object' && value !== null && 'policyNumber' in value
}

const initialStage: Stage =
  input.boardType === 'ENDORSEMENT' ? 'QUOTE' : 'CAPTURE'
```

In `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`, map the new fields both ways:

```typescript
sourcePolicyId: row.sourcePolicyId,
endorsementType: row.endorsementType,
endorsementReason: row.endorsementReason,
sourcePolicySnapshot: isSourcePolicySnapshot(row.sourcePolicySnapshot)
  ? row.sourcePolicySnapshot
  : null,
```

- [ ] **Step 4: Run Prisma validation and the domain test again**

Run:

```bash
pnpm --filter @repo/db exec prisma validate
pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/proposal.spec.ts
```

Expected: Prisma validation passes, and the new endorsement test passes.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma \
  packages/db/prisma/migrations/*_add_endorsement_proposal_fields/migration.sql \
  packages/core/src/modules/proposal/domain/proposal.ts \
  packages/core/src/modules/proposal/domain/proposal.spec.ts \
  packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts
git commit -m "feat(proposal): add endorsement proposal metadata"
```

---

## Task 2: Validate endorsement creation against active policies

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal-errors.ts`
- Modify: `packages/core/src/modules/proposal/application/create-proposal.ts`
- Modify: `packages/core/src/modules/proposal/application/create-proposal.spec.ts`
- Modify: `apps/server/src/container-registrations.ts`

- [ ] **Step 1: Write the failing application tests**

In `packages/core/src/modules/proposal/application/create-proposal.spec.ts`, replace the constructor setup with a `PolicyRepository` mock and add:

```typescript
import type {
  PolicyData,
  PolicyRepository,
} from '../../policy/domain/policy-repository.js'

function createMockPolicyRepo(
  policy: PolicyData | null = null
): PolicyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(policy),
    findMany: vi.fn(),
    cancel: vi.fn(),
  }
}

it('creates endorsement proposal from an active source policy and copies snapshot data', async () => {
  const repo = createMockRepo()
  const checklistRepo = createMockChecklistRepo()
  const checklistConfig = createMockChecklistConfig([
    { itemKey: 'BROKER_QUOTE', label: 'Cotação no broker', isRequired: true },
  ])
  const policyRepo = createMockPolicyRepo({
    id: 'pol-1',
    organizationId: 'org-1',
    proposalId: 'proposal-origin',
    clientId: 'client-1',
    salespersonId: 'user-2',
    policyNumber: 'POL-001',
    status: 'ACTIVE',
    branch: 'AUTO',
    premiumValueInCents: 250000,
    coverageDetails: null,
    startDate: new Date('2026-02-01T00:00:00.000Z'),
    endDate: new Date('2027-02-01T00:00:00.000Z'),
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    clientName: 'Maria Souza',
    salespersonName: 'Jainne',
    insurerName: 'Porto',
  })
  const useCase = new CreateProposal(
    repo,
    checklistRepo,
    checklistConfig,
    policyRepo
  )

  const result = await useCase.execute({
    organizationId: 'org-1',
    salespersonId: 'user-1',
    boardType: 'ENDORSEMENT',
    sourcePolicyId: 'pol-1',
    endorsementType: 'COVERAGE_CHANGE',
    endorsementReason: 'Adicionar cobertura para vidros',
  })

  expect(result.stage).toBe('QUOTE')
  expect(result.clientId).toBe('client-1')
  expect(result.branch).toBe('AUTO')
  expect(result.insurerId).toBeNull()
  expect(result.sourcePolicySnapshot?.policyNumber).toBe('POL-001')
  expect(checklistConfig.getItems).toHaveBeenCalledWith('QUOTE', 'AUTO')
})

it('rejects endorsement creation when source policy is not active', async () => {
  const useCase = new CreateProposal(
    createMockRepo(),
    createMockChecklistRepo(),
    createMockChecklistConfig(),
    createMockPolicyRepo({
      id: 'pol-1',
      organizationId: 'org-1',
      clientId: 'client-1',
      salespersonId: 'user-2',
      proposalId: 'proposal-origin',
      policyNumber: 'POL-001',
      status: 'CANCELLED',
      branch: 'AUTO',
      premiumValueInCents: 0,
      coverageDetails: null,
      startDate: new Date(),
      endDate: new Date(),
      cancelledAt: new Date(),
      cancelReason: 'cancelada',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  )

  await expect(
    useCase.execute({
      organizationId: 'org-1',
      salespersonId: 'user-1',
      boardType: 'ENDORSEMENT',
      sourcePolicyId: 'pol-1',
      endorsementType: 'COVERAGE_CHANGE',
      endorsementReason: 'Adicionar cobertura para vidros',
    })
  ).rejects.toThrow('A apólice de origem precisa estar em vigor')
})
```

- [ ] **Step 2: Run the application test to verify it fails**

Run: `pnpm --filter @repo/core exec vitest run src/modules/proposal/application/create-proposal.spec.ts`

Expected: FAIL because `CreateProposal` still expects only three constructor dependencies and has no endorsement policy validation.

- [ ] **Step 3: Implement endorsement validation in the use case**

In `packages/core/src/modules/proposal/domain/proposal-errors.ts`, add:

```typescript
export class SourcePolicyRequiredForEndorsementError extends Error {
  readonly code = 'SOURCE_POLICY_REQUIRED_FOR_ENDORSEMENT' as const
  constructor() {
    super('Endosso exige uma apólice de origem')
    this.name = 'SourcePolicyRequiredForEndorsementError'
  }
}

export class SourcePolicyNotEligibleError extends Error {
  readonly code = 'SOURCE_POLICY_NOT_ELIGIBLE' as const
  constructor(policyId: string) {
    super(`A apólice de origem precisa estar em vigor (${policyId})`)
    this.name = 'SourcePolicyNotEligibleError'
  }
}
```

In `packages/core/src/modules/proposal/application/create-proposal.ts`, inject `PolicyRepository` and normalize endorsement input:

```typescript
interface CreateProposalDTOBase {
  organizationId: string
  salespersonId: string
}

type CreateProposalDTO =
  | (CreateProposalDTOBase & {
      clientId: string
      branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER'
      boardType: 'NEW_INSURANCE' | 'RENEWAL'
      renewalPolicyId?: string
      insurerId?: string
    })
  | (CreateProposalDTOBase & {
      boardType: 'ENDORSEMENT'
      sourcePolicyId: string
      endorsementType: string
      endorsementReason: string
    })

async execute(dto: CreateProposalDTO): Promise<Proposal> {
  if (dto.boardType === 'ENDORSEMENT') {
    const policy = await this.policyRepo.findById(
      dto.sourcePolicyId,
      dto.organizationId
    )

    if (!policy) {
      throw ProposalErrors.sourcePolicyNotEligible(dto.sourcePolicyId)
    }

    if (policy.status !== 'ACTIVE') {
      throw ProposalErrors.sourcePolicyNotEligible(dto.sourcePolicyId)
    }

    const proposal = Proposal.create({
      organizationId: dto.organizationId,
      clientId: policy.clientId,
      salespersonId: dto.salespersonId,
      branch: policy.branch,
      boardType: 'ENDORSEMENT',
      sourcePolicyId: policy.id,
      endorsementType: dto.endorsementType,
      endorsementReason: dto.endorsementReason,
      sourcePolicySnapshot: {
        policyNumber: policy.policyNumber,
        clientName: policy.clientName ?? 'Sem cliente',
        startDate: policy.startDate,
        endDate: policy.endDate,
        status: policy.status,
        insurerId: null,
        insurerName: policy.insurerName ?? null,
      },
    })
```

In `apps/server/src/container-registrations.ts`, update the factory:

```typescript
container.register(CreateProposal, {
  useFactory: () =>
    new CreateProposal(
      proposalRepo,
      checklistRepo,
      checklistConfig,
      policyRepo
    ),
})
```

- [ ] **Step 4: Run the unit tests again**

Run:

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/create-proposal.spec.ts
pnpm --filter @app/server typecheck
```

Expected: Proposal creation tests pass, and server typecheck passes with the new constructor signature.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/proposal/domain/proposal-errors.ts \
  packages/core/src/modules/proposal/application/create-proposal.ts \
  packages/core/src/modules/proposal/application/create-proposal.spec.ts \
  apps/server/src/container-registrations.ts
git commit -m "feat(proposal): validate endorsement source policies"
```

---

## Task 3: Expose endorsement proposal fields and filters through the proposal API

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal-repository.ts`
- Modify: `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts`
- Modify: `apps/server/src/routes/v1/proposals/_schemas.ts`
- Modify: `apps/web/src/api/endpoints/proposals/proposals.ts`
- Modify: `apps/web/src/api/endpoints/proposals/proposals.zod.ts`
- Modify: `apps/web/src/api/model/*`

- [ ] **Step 1: Write the failing repository/list test**

In `packages/core/src/modules/proposal/application/create-proposal.spec.ts`, add one more expectation to lock the board search contract:

```typescript
expect(checklistConfig.getItems).toHaveBeenCalledWith('QUOTE', 'AUTO')
```

Then in `packages/core/src/modules/proposal/domain/proposal-repository.ts`, extend the target filters in the test comments you will implement:

```typescript
export interface ProposalFilters {
  organizationId: string
  stage?: Stage
  clientId?: string
  salespersonId?: string
  boardType?: BoardType
  insurerId?: string
  sourcePolicyId?: string
  createdFrom?: Date
  createdTo?: Date
  search?: string
}
```

- [ ] **Step 2: Update schemas, repository filters, and Orval contract**

In `apps/server/src/routes/v1/proposals/_schemas.ts`, make the request body a discriminated union and expose endorsement fields in responses:

```typescript
const standardCreateProposalBody = z.object({
  clientId: z.string().min(1),
  branch: branchEnum,
  boardType: z.enum(['NEW_INSURANCE', 'RENEWAL']),
  renewalPolicyId: z.string().optional(),
  insurerId: z.string().optional(),
})

const endorsementCreateProposalBody = z.object({
  boardType: z.literal('ENDORSEMENT'),
  sourcePolicyId: z.string().min(1),
  endorsementType: z.string().min(1),
  endorsementReason: z.string().min(1),
})

export const createProposalBody = z.discriminatedUnion('boardType', [
  standardCreateProposalBody,
  endorsementCreateProposalBody,
])

export const listProposalsQuery = paginationQuery().extend({
  stage: proposalStageEnum.optional(),
  clientId: z.string().optional(),
  salespersonId: z.string().optional(),
  insurerId: z.string().optional(),
  sourcePolicyId: z.string().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  boardType: boardTypeEnum.optional(),
  search: z.string().optional(),
})
```

In `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts`, extend `PROPOSAL_INCLUDE` and the search path:

```typescript
const PROPOSAL_INCLUDE = {
  client: { select: { name: true, document: true } },
  salesperson: { select: { name: true } },
  insurer: { select: { name: true } },
  sourcePolicy: { select: { policyNumber: true } },
} satisfies Prisma.ProposalInclude

...(filters.search && {
  OR: [
    {
      client: {
        name: { contains: filters.search, mode: 'insensitive' },
      },
    },
    {
      sourcePolicy: {
        policyNumber: { contains: filters.search, mode: 'insensitive' },
      },
    },
  ],
}),
...(filters.insurerId && { insurerId: filters.insurerId }),
...(filters.sourcePolicyId && { sourcePolicyId: filters.sourcePolicyId }),
...(filters.createdFrom || filters.createdTo
  ? {
      createdAt: {
        ...(filters.createdFrom && { gte: filters.createdFrom }),
        ...(filters.createdTo && { lte: filters.createdTo }),
      },
    }
  : {}),
```

- [ ] **Step 3: Regenerate the web API client**

Run:

```bash
pnpm --filter @app/web generate:api
```

Expected: `apps/web/src/api/endpoints/proposals/proposals.ts`, `proposals.zod.ts`, and `apps/web/src/api/model/*` are regenerated with `ENDORSEMENT`, `sourcePolicyId`, `endorsementType`, `endorsementReason`, `sourcePolicySnapshot`, `insurerId`, `salespersonId`, `createdFrom`, and `createdTo`.

- [ ] **Step 4: Run typechecks for backend and web**

Run:

```bash
pnpm --filter @app/server typecheck
pnpm --filter @app/web typecheck
```

Expected: PASS. Any generated type errors should be fixed before moving on.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/proposal/domain/proposal-repository.ts \
  packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts \
  apps/server/src/routes/v1/proposals/_schemas.ts \
  apps/web/src/api/endpoints/proposals/proposals.ts \
  apps/web/src/api/endpoints/proposals/proposals.zod.ts \
  apps/web/src/api/model
git commit -m "feat(api): expose endorsement proposal fields"
```

---

## Task 4: Add the policy-detail entry point and disambiguate the old endorsement flow

**Files:**

- Create: `apps/web/src/features/proposals/components/endorsement-proposal-sheet.tsx`
- Modify: `apps/web/src/features/policies/components/policy-detail.tsx`
- Modify: `apps/web/src/features/policies/components/policy-tabs.tsx`

- [ ] **Step 1: Create the endorsement proposal sheet**

Create `apps/web/src/features/proposals/components/endorsement-proposal-sheet.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useCreateProposal } from '../hooks/use-proposals'
import { z } from 'zod'

const formSchema = z.object({
  endorsementType: z.string().min(1, 'Selecione o tipo de endosso'),
  endorsementReason: z.string().min(1, 'Descreva a alteração'),
})

interface EndorsementProposalSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: {
    id: string
    policyNumber: string
    clientName: string | null
    branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER'
  }
}

export function EndorsementProposalSheet({
  open,
  onOpenChange,
  policy,
}: EndorsementProposalSheetProps) {
  const router = useRouter()
  const createProposal = useCreateProposal()
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      endorsementType: '',
      endorsementReason: '',
    },
  })

  function handleSubmit(values: z.infer<typeof formSchema>) {
    createProposal.mutate(
      {
        boardType: 'ENDORSEMENT',
        sourcePolicyId: policy.id,
        endorsementType: values.endorsementType,
        endorsementReason: values.endorsementReason,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          router.push('/endorsements')
        },
      }
    )
  }
```

- [ ] **Step 2: Wire the entry point on active policies**

In `apps/web/src/features/policies/components/policy-detail.tsx`, add the new CTA only for active policies:

```tsx
const [showEndorsementSheet, setShowEndorsementSheet] = useState(false)

{
  policy.status === 'ACTIVE' && (
    <Button size="sm" onClick={() => setShowEndorsementSheet(true)}>
      Criar Endosso
    </Button>
  )
}

;<EndorsementProposalSheet
  open={showEndorsementSheet}
  onOpenChange={setShowEndorsementSheet}
  policy={{
    id: policy.id,
    policyNumber: policy.policyNumber,
    clientName: policy.clientName ?? null,
    branch: policy.branch,
  }}
/>
```

- [ ] **Step 3: Rename the old policy-tab flow to historical registration**

In `apps/web/src/features/policies/components/policy-tabs.tsx`, keep the existing module but change the copy:

```tsx
<TabsTab value="endorsements">Registros de Endosso</TabsTab>

<Button size="sm" variant="outline" onClick={() => setEndorsementFormOpen(true)}>
  <Plus className="mr-1 h-4 w-4" />
  Registrar Endosso Histórico
</Button>
```

This preserves the older `Endorsement` module without confusing it with the new operational kanban flow.

- [ ] **Step 4: Run web typecheck**

Run: `pnpm --filter @app/web typecheck`

Expected: PASS, with the sheet using the regenerated `CreateProposalBody` endorsement branch correctly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/proposals/components/endorsement-proposal-sheet.tsx \
  apps/web/src/features/policies/components/policy-detail.tsx \
  apps/web/src/features/policies/components/policy-tabs.tsx
git commit -m "feat(web): add policy endorsement proposal entry"
```

---

## Task 5: Build the dedicated Endorsements dashboard and locked kanban flow

**Files:**

- Create: `apps/web/src/app/(dashboard)/endorsements/page.tsx`
- Modify: `apps/web/src/components/layout/sidebar.tsx`
- Modify: `apps/web/src/app/(dashboard)/proposals/proposals-content.tsx`
- Modify: `apps/web/src/features/proposals/lib/constants.ts`
- Modify: `apps/web/src/features/proposals/hooks/use-kanban-proposals.ts`
- Modify: `apps/web/src/features/proposals/components/kanban-parts.tsx`
- Modify: `apps/web/src/features/proposals/components/proposal-kanban.tsx`
- Modify: `apps/web/src/features/proposals/components/proposals-table.tsx`
- Modify: `apps/web/src/features/proposals/components/proposals-table-toolbar.tsx`

- [ ] **Step 1: Add the dedicated dashboard route**

Create `apps/web/src/app/(dashboard)/endorsements/page.tsx`:

```tsx
import { ProposalKanban } from '@/features/proposals/components/proposal-kanban'

export default function EndorsementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Endossos</h1>
        <p className="text-muted-foreground text-sm">
          Pipeline operacional de endossos vinculados a apólices em vigor.
        </p>
      </div>

      <ProposalKanban
        initialBoardType="ENDORSEMENT"
        allowedBoardTypes={['ENDORSEMENT']}
        searchPlaceholder="Buscar por apólice ou segurado..."
        showEndorsementFilters
      />
    </div>
  )
}
```

- [ ] **Step 2: Add sidebar navigation and keep proposals page scoped**

In `apps/web/src/components/layout/sidebar.tsx`, add:

```tsx
{
  href: '/endorsements',
  label: 'Endossos',
  icon: FileText,
  permission: 'proposals:read',
},
```

In `apps/web/src/app/(dashboard)/proposals/proposals-content.tsx`, keep the proposal page focused on its original board types:

```tsx
{
  viewMode === 'table' ? (
    <ProposalsTable allowedBoardTypes={['NEW_INSURANCE', 'RENEWAL']} />
  ) : (
    <ProposalKanban
      initialBoardType="NEW_INSURANCE"
      allowedBoardTypes={['NEW_INSURANCE', 'RENEWAL']}
    />
  )
}
```

In `apps/web/src/features/proposals/components/proposals-table.tsx`, add the prop and default board filter behavior:

```tsx
interface ProposalsTableProps {
  allowedBoardTypes?: BoardType[]
}

export function ProposalsTable({
  allowedBoardTypes = ['NEW_INSURANCE', 'RENEWAL'],
}: ProposalsTableProps) {
  // existing state...

  const boardType =
    boardTypeFilter !== ALL_VALUE
      ? (boardTypeFilter as BoardType)
      : allowedBoardTypes.length === 1
        ? allowedBoardTypes[0]
        : undefined
```

In `apps/web/src/features/proposals/components/proposals-table-toolbar.tsx`, limit the dropdown options:

```tsx
interface ProposalsTableToolbarProps {
  // existing props...
  readonly allowedBoardTypes: BoardType[]
}

{
  allowedBoardTypes.map((bt) => (
    <SelectItem key={bt} value={bt}>
      {BOARD_TYPE_LABELS[bt]}
    </SelectItem>
  ))
}
```

- [ ] **Step 3: Lock board configuration and add endorsement filters**

In `apps/web/src/features/proposals/lib/constants.ts`, extend labels:

```typescript
export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  NEW_INSURANCE: 'Novo Seguro',
  RENEWAL: 'Renovação',
  ENDORSEMENT: 'Endosso',
}

export const ENDORSEMENT_STAGE_LABELS: Partial<Record<ProposalStage, string>> =
  {
    QUOTE: 'Cotação',
    PROTOCOL: 'Protocolo',
    INSPECTION: 'Pendência',
    PAYMENT: 'Pagamento',
    POLICY_ISSUED: 'Apólice',
    LOST: 'Perda',
  }
```

In `apps/web/src/features/proposals/hooks/use-kanban-proposals.ts`, extend filters:

```typescript
export interface KanbanFilters {
  boardType: BoardType
  search?: string
  insurerId?: string
  salespersonId?: string
  createdFrom?: string
  createdTo?: string
}
```

In `apps/web/src/features/proposals/components/proposal-kanban.tsx`, add props:

```tsx
interface ProposalKanbanProps {
  initialBoardType?: BoardType
  allowedBoardTypes?: BoardType[]
  searchPlaceholder?: string
  showEndorsementFilters?: boolean
}

const [boardType, setBoardType] = useState<BoardType>(
  initialBoardType ?? 'NEW_INSURANCE'
)
const boardToggleVisible = (allowedBoardTypes ?? BOARD_TYPES).length > 1
```

In `apps/web/src/features/proposals/components/kanban-parts.tsx`, render extra filters when `showEndorsementFilters` is true and hide the board toggle when `boardToggleVisible` is false.

- [ ] **Step 4: Run web typecheck and a quick smoke build**

Run:

```bash
pnpm --filter @app/web typecheck
pnpm --filter @app/web build
```

Expected: PASS. The new page compiles and the kanban component works both in `/proposals` and `/endorsements`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/endorsements/page.tsx \
  apps/web/src/components/layout/sidebar.tsx \
  apps/web/src/app/(dashboard)/proposals/proposals-content.tsx \
  apps/web/src/features/proposals/lib/constants.ts \
  apps/web/src/features/proposals/hooks/use-kanban-proposals.ts \
  apps/web/src/features/proposals/components/kanban-parts.tsx \
  apps/web/src/features/proposals/components/proposal-kanban.tsx \
  apps/web/src/features/proposals/components/proposals-table.tsx \
  apps/web/src/features/proposals/components/proposals-table-toolbar.tsx
git commit -m "feat(web): add dedicated endorsements dashboard"
```

---

## Task 6: Add source-policy context to cards/details and cover with E2E smoke

**Files:**

- Modify: `apps/web/src/features/proposals/components/kanban-card.tsx`
- Modify: `apps/web/src/features/proposals/components/kanban-card-detail.tsx`
- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx`
- Create: `e2e/tests/endorsement-kanban.spec.ts`

- [ ] **Step 1: Show source-policy context in the kanban card**

In `apps/web/src/features/proposals/components/kanban-card.tsx`, branch on endorsement proposals:

```tsx
const isEndorsement = proposal.boardType === 'ENDORSEMENT'

{
  isEndorsement ? (
    <>
      <p className="truncate text-sm font-medium">
        {proposal.sourcePolicySnapshot?.clientName ??
          proposal.clientName ??
          'Cliente'}
      </p>
      <p className="text-muted-foreground text-xs">
        Apólice {proposal.sourcePolicySnapshot?.policyNumber ?? '—'}
      </p>
      <p className="text-muted-foreground text-xs">
        {proposal.endorsementType ?? 'Endosso'}
      </p>
    </>
  ) : (
    <p className="truncate text-sm font-medium">
      {proposal.clientName ?? 'Cliente'}
    </p>
  )
}
```

- [ ] **Step 2: Show the source-policy panel in kanban/detail views**

In `apps/web/src/features/proposals/components/kanban-card-detail.tsx`, add a dedicated panel:

```tsx
{
  proposal.boardType === 'ENDORSEMENT' && proposal.sourcePolicySnapshot ? (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        Apólice de origem
      </p>
      <DetailItem label="Número">
        <span>{proposal.sourcePolicySnapshot.policyNumber}</span>
      </DetailItem>
      <DetailItem label="Segurado">
        <span>{proposal.sourcePolicySnapshot.clientName}</span>
      </DetailItem>
      <DetailItem label="Motivo">
        <span>{proposal.endorsementReason ?? '—'}</span>
      </DetailItem>
      {proposal.sourcePolicyId && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/policies/${proposal.sourcePolicyId}`}>Ver apólice</Link>
        </Button>
      )}
    </div>
  ) : null
}
```

Mirror the same block in `apps/web/src/features/proposals/components/proposal-detail.tsx` so the full detail page stays consistent with the kanban dialog.

- [ ] **Step 3: Add E2E smoke coverage**

Create `e2e/tests/endorsement-kanban.spec.ts`:

```typescript
import { expect, test } from '../fixtures/auth.fixture'

test.describe('Endorsement Kanban Flow', () => {
  test('endorsement dashboard is reachable from the sidebar', async ({
    authedPage: page,
  }) => {
    await page.goto('/endorsements')
    await expect(page.locator('h1')).toContainText('Endossos')
    await expect(page.locator('text=Cotação')).toBeVisible({ timeout: 10_000 })
  })

  test('active policy detail exposes the create endorsement action', async ({
    authedPage: page,
  }) => {
    await page.goto('/policies')

    const firstPolicyLink = page.locator('a[href^="/policies/"]').first()
    if (await firstPolicyLink.isVisible()) {
      await firstPolicyLink.click()
      const button = page.locator('button', { hasText: 'Criar Endosso' })
      if (await button.isVisible()) {
        await button.click()
        await expect(page.locator('text=Novo Endosso')).toBeVisible()
      }
    }
  })
})
```

- [ ] **Step 4: Run typecheck and the targeted Playwright test**

Run:

```bash
pnpm --filter @app/web typecheck
pnpm exec playwright test e2e/tests/endorsement-kanban.spec.ts
```

Expected: web typecheck passes; Playwright passes in an environment with seeded authenticated data. If the environment lacks policy fixtures, document that the second test is conditional by design.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/proposals/components/kanban-card.tsx \
  apps/web/src/features/proposals/components/kanban-card-detail.tsx \
  apps/web/src/features/proposals/components/proposal-detail.tsx \
  e2e/tests/endorsement-kanban.spec.ts
git commit -m "feat(web): show endorsement policy context"
```

---

## Self-Review

### Spec coverage

- Dedicated endorsement flow on top of `Proposal`: covered by Tasks 1, 2, 3, and 5.
- Creation only from active policy: covered by Tasks 2 and 4.
- Immutable `sourcePolicyId` + snapshot: covered by Tasks 1 and 2.
- Dedicated Endorsements board and navigation: covered by Task 5.
- Source policy visible in card/detail: covered by Task 6.
- Fixed MVP stages mapped onto current proposal stage machine: covered by Task 5 through board-specific labels.
- Strong backend validation: covered by Tasks 2 and 3.
- Existing historical Endorsement module coexistence: covered by Task 4.

### Placeholder scan

- No `TODO`, `TBD`, “implement later”, or “similar to previous task” placeholders remain.
- Migration path uses `<timestamp>` intentionally, matching existing Prisma migration workflow in this repository.

### Type consistency

- `boardType = 'ENDORSEMENT'` is used consistently across Prisma, core, API, and web tasks.
- `sourcePolicyId`, `endorsementType`, `endorsementReason`, and `sourcePolicySnapshot` are the same field names across all layers.
- Endorsement proposals start at `QUOTE`, which matches the spec-approved visible first stage `Cotação`.
