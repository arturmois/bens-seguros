# SCRUM-49: Renewal Policy Number — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow brokers to type the previous policy number as free text when creating a renewal proposal, with automatic linking when the policy exists in the system.

**Architecture:** New `renewalPolicyNumber` field flows through all layers (Prisma → Entity → Use Case → Route → Frontend). The `CreateProposal` use case performs a smart lookup: if the typed number matches an existing policy, it sets `renewalPolicyId` automatically; otherwise it stores only the number for future reference.

**Tech Stack:** Prisma 7 (schema), TypeScript (domain/use case), Fastify + Zod (routes), React 19 + React Hook Form (frontend), Vitest (tests)

---

## File Map

| Action | File                                                                          | Responsibility                               |
| ------ | ----------------------------------------------------------------------------- | -------------------------------------------- |
| Modify | `packages/db/prisma/schema.prisma`                                            | Add `renewalPolicyNumber` to Proposal model  |
| Modify | `packages/core/src/modules/proposal/domain/proposal.ts`                       | Add prop, getter, create input               |
| Modify | `packages/core/src/modules/proposal/domain/proposal.spec.ts`                  | Test new field                               |
| Modify | `packages/core/src/modules/policy/domain/policy-repository.ts`                | Add `findByPolicyNumber` method              |
| Modify | `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts` | Implement `findByPolicyNumber`               |
| Modify | `packages/core/src/modules/proposal/application/create-proposal.ts`           | Add lookup logic                             |
| Modify | `packages/core/src/modules/proposal/application/create-proposal.spec.ts`      | Test 3 renewal scenarios                     |
| Modify | `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`        | Map new field                                |
| Modify | `packages/core/src/modules/proposal/infrastructure/proposal-mapper.spec.ts`   | Test mapper with new field                   |
| Modify | `apps/server/src/routes/v1/proposals/_schemas.ts`                             | Add `renewalPolicyNumber` to body + response |
| Create | `apps/web/src/features/proposals/components/renewal-policy-input.tsx`         | New text input with auto-lookup              |
| Modify | `apps/web/src/features/proposals/components/proposal-form.tsx`                | Swap `PolicySearch` for `RenewalPolicyInput` |
| Modify | `apps/web/src/features/proposals/components/proposal-detail.tsx`              | Show `renewalPolicyNumber` when no link      |

---

### Task 1: Prisma Schema — Add `renewalPolicyNumber`

**Files:**

- Modify: `packages/db/prisma/schema.prisma:308-350`

- [ ] **Step 1: Add field to Proposal model**

In `packages/db/prisma/schema.prisma`, add `renewalPolicyNumber` right after `renewalPolicyId` (line 319):

```prisma
  renewalPolicyId             String?
  renewalPolicyNumber         String?
```

- [ ] **Step 2: Generate Prisma client and push schema**

```bash
pnpm --filter @repo/db exec prisma generate
pnpm --filter @repo/db exec prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): add renewalPolicyNumber to Proposal model"
```

---

### Task 2: Domain — Proposal Entity

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal.ts`
- Test: `packages/core/src/modules/proposal/domain/proposal.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `packages/core/src/modules/proposal/domain/proposal.spec.ts`, after the `creates with renewal policy reference` test (around line 144):

```typescript
it('creates renewal with renewalPolicyNumber', () => {
  const proposal = Proposal.create({
    ...validProps,
    boardType: 'RENEWAL',
    renewalPolicyNumber: 'POL-EXTERNAL-001',
  })
  expect(proposal.boardType).toBe('RENEWAL')
  expect(proposal.renewalPolicyNumber).toBe('POL-EXTERNAL-001')
  expect(proposal.renewalPolicyId).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/proposal.spec.ts
```

Expected: FAIL — `renewalPolicyNumber` does not exist on type `CreateProposalInput`

- [ ] **Step 3: Add `renewalPolicyNumber` to ProposalProps, CreateProposalInput, create(), and getter**

In `packages/core/src/modules/proposal/domain/proposal.ts`:

**ProposalProps** — add after `renewalPolicyId` (line 121):

```typescript
renewalPolicyId: string | null
renewalPolicyNumber: string | null
```

**CreateProposalInput** — add after `renewalPolicyId` (line 150):

```typescript
  renewalPolicyId?: string
  renewalPolicyNumber?: string
```

**`Proposal.create()`** — add after `renewalPolicyId` assignment (line 177):

```typescript
      renewalPolicyId: input.renewalPolicyId ?? null,
      renewalPolicyNumber: input.renewalPolicyNumber ?? null,
```

**Getter** — add after the `renewalPolicyId` getter (after line 316):

```typescript
  get renewalPolicyNumber(): string | null {
    return this.props.renewalPolicyNumber
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/proposal.spec.ts
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/proposal/domain/proposal.ts packages/core/src/modules/proposal/domain/proposal.spec.ts
git commit -m "feat(core): add renewalPolicyNumber to Proposal entity"
```

---

### Task 3: Domain — PolicyRepository Interface

**Files:**

- Modify: `packages/core/src/modules/policy/domain/policy-repository.ts`

- [ ] **Step 1: Add `findByPolicyNumber` to PolicyRepository interface**

In `packages/core/src/modules/policy/domain/policy-repository.ts`, add to the `PolicyRepository` interface (after `findById`, line 85):

```typescript
export interface PolicyRepository {
  create(data: CreatePolicyInput): Promise<PolicyData>
  findById(id: string, organizationId: string): Promise<PolicyData | null>
  findByPolicyNumber(
    policyNumber: string,
    organizationId: string
  ): Promise<PolicyData | null>
  findMany(filters: PolicyFilters, page: PolicyCursorPage): Promise<PolicyPage>
  cancel(
    id: string,
    organizationId: string,
    reason: string
  ): Promise<PolicyData>
}
```

- [ ] **Step 2: Implement in PrismaPolicyRepository**

In `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts`, add after `findById` method (after line 71):

```typescript
  async findByPolicyNumber(
    policyNumber: string,
    organizationId: string
  ): Promise<PolicyData | null> {
    const row = await this.prisma.policy.findFirst({
      where: { policyNumber, organizationId, deletedAt: null },
      include: POLICY_INCLUDE,
    })
    return row ? PolicyMapper.toDomain(row) : null
  }
```

- [ ] **Step 3: Verify typecheck passes**

```bash
pnpm --filter @repo/core exec tsc --noEmit
```

Expected: no errors. If any test mock is missing the new method, fix it.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/policy/domain/policy-repository.ts packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts
git commit -m "feat(core): add findByPolicyNumber to PolicyRepository"
```

---

### Task 4: Use Case — CreateProposal Lookup Logic

**Files:**

- Modify: `packages/core/src/modules/proposal/application/create-proposal.ts`
- Test: `packages/core/src/modules/proposal/application/create-proposal.spec.ts`

- [ ] **Step 1: Add `findByPolicyNumber` to mock in test file**

In `packages/core/src/modules/proposal/application/create-proposal.spec.ts`, update `createMockPolicyRepo` (line 38):

```typescript
function createMockPolicyRepo(
  policy: PolicyData | null = null
): PolicyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(policy),
    findByPolicyNumber: vi.fn().mockResolvedValue(policy),
    findMany: vi.fn(),
    cancel: vi.fn(),
  }
}
```

- [ ] **Step 2: Write failing test — renewal with matching policy number**

Add to the `describe('CreateProposal')` block:

```typescript
it('resolves renewalPolicyId when renewalPolicyNumber matches an existing policy', async () => {
  const policyRepo = createMockPolicyRepo()
  const matchedPolicy: PolicyData = {
    id: 'pol-existing',
    organizationId: 'org-1',
    proposalId: 'prop-old',
    clientId: 'client-1',
    salespersonId: 'user-1',
    policyNumber: 'POL-2025-001',
    status: 'ACTIVE',
    branch: 'AUTO',
    premiumValueInCents: 150000,
    coverageDetails: null,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    insurerId: null,
  }
  vi.mocked(policyRepo.findByPolicyNumber).mockResolvedValue(matchedPolicy)

  const useCase = new CreateProposal(
    createMockRepo(),
    createMockChecklistRepo(),
    createMockChecklistConfig(),
    policyRepo
  )

  const result = await useCase.execute({
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'RENEWAL',
    renewalPolicyNumber: 'POL-2025-001',
  })

  expect(result.renewalPolicyNumber).toBe('POL-2025-001')
  expect(result.renewalPolicyId).toBe('pol-existing')
  expect(policyRepo.findByPolicyNumber).toHaveBeenCalledWith(
    'POL-2025-001',
    'org-1'
  )
})
```

- [ ] **Step 3: Write failing test — renewal with non-matching policy number**

```typescript
it('stores renewalPolicyNumber without link when policy number does not exist', async () => {
  const policyRepo = createMockPolicyRepo()
  vi.mocked(policyRepo.findByPolicyNumber).mockResolvedValue(null)

  const useCase = new CreateProposal(
    createMockRepo(),
    createMockChecklistRepo(),
    createMockChecklistConfig(),
    policyRepo
  )

  const result = await useCase.execute({
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'RENEWAL',
    renewalPolicyNumber: 'POL-EXTERNAL-999',
  })

  expect(result.renewalPolicyNumber).toBe('POL-EXTERNAL-999')
  expect(result.renewalPolicyId).toBeNull()
})
```

- [ ] **Step 4: Write failing test — renewal without number preserves current behavior**

```typescript
it('creates renewal without renewalPolicyNumber preserving current behavior', async () => {
  const useCase = new CreateProposal(
    createMockRepo(),
    createMockChecklistRepo(),
    createMockChecklistConfig(),
    createMockPolicyRepo()
  )

  const result = await useCase.execute({
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'RENEWAL',
  })

  expect(result.renewalPolicyNumber).toBeNull()
  expect(result.renewalPolicyId).toBeNull()
})
```

- [ ] **Step 5: Run tests to verify they fail**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/create-proposal.spec.ts
```

Expected: 3 new tests FAIL — `renewalPolicyNumber` not in DTO type, no lookup logic

- [ ] **Step 6: Update CreateProposal DTO and execute method**

In `packages/core/src/modules/proposal/application/create-proposal.ts`:

**Add `renewalPolicyNumber` to the NEW_INSURANCE/RENEWAL DTO variant** (after `renewalPolicyId`, line 27):

```typescript
      renewalPolicyId?: string
      renewalPolicyNumber?: string
```

**Update `execute` method** — replace the non-endorsement branch (line 53-54):

```typescript
  async execute(dto: CreateProposalDTO): Promise<Proposal> {
    const proposal =
      dto.boardType === 'ENDORSEMENT'
        ? await this.createEndorsementProposal(dto)
        : await this.createRenewalOrNewProposal(dto)

    if (!proposal.quoteValidUntil) {
      const validity = new Date(proposal.createdAt)
      validity.setDate(validity.getDate() + 15)
      proposal.updateQuoteValidity(validity)
    }

    await this.proposalRepo.save(proposal)

    const items = this.checklistConfig.getItems(proposal.stage, proposal.branch)
    if (items.length > 0) {
      await this.checklistRepo.createMany(
        proposal.id,
        items.map((i) => ({
          itemKey: i.itemKey,
          label: i.label,
          isRequired: i.isRequired,
        }))
      )
    }

    return proposal
  }

  private async createRenewalOrNewProposal(
    dto: Extract<CreateProposalDTO, { boardType: 'NEW_INSURANCE' | 'RENEWAL' }>
  ): Promise<Proposal> {
    let resolvedPolicyId = dto.renewalPolicyId ?? null

    if (
      dto.boardType === 'RENEWAL' &&
      dto.renewalPolicyNumber &&
      !resolvedPolicyId
    ) {
      const found = await this.policyRepo.findByPolicyNumber(
        dto.renewalPolicyNumber,
        dto.organizationId
      )
      if (found) {
        resolvedPolicyId = found.id
      }
    }

    return Proposal.create({
      ...dto,
      renewalPolicyId: resolvedPolicyId ?? undefined,
      renewalPolicyNumber: dto.renewalPolicyNumber,
    })
  }
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/create-proposal.spec.ts
```

Expected: ALL PASS (existing + 3 new)

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/modules/proposal/application/create-proposal.ts packages/core/src/modules/proposal/application/create-proposal.spec.ts
git commit -m "feat(core): add renewalPolicyNumber lookup in CreateProposal"
```

---

### Task 5: Infrastructure — ProposalMapper

**Files:**

- Modify: `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`
- Modify: `packages/core/src/modules/proposal/infrastructure/proposal-mapper.spec.ts`

- [ ] **Step 1: Add `renewalPolicyNumber` to `toDomain`**

In `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`, `toDomain` method — add after `renewalPolicyId` (line 33):

```typescript
      renewalPolicyId: row.renewalPolicyId,
      renewalPolicyNumber: row.renewalPolicyNumber ?? null,
```

- [ ] **Step 2: Add `renewalPolicyNumber` to `toPersistence`**

In the `toPersistence` method — add after `renewalPolicyId` (line 75):

```typescript
      renewalPolicyId: json.renewalPolicyId,
      renewalPolicyNumber: json.renewalPolicyNumber,
```

- [ ] **Step 3: Fix mapper spec — add field to restore payloads**

In `packages/core/src/modules/proposal/infrastructure/proposal-mapper.spec.ts`, the `drops invalid source policy snapshot` test has a raw object passed to `toDomain` (line 58). Add `renewalPolicyNumber: null` after `renewalPolicyId: null` (line 70):

```typescript
      renewalPolicyId: null,
      renewalPolicyNumber: null,
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/infrastructure/proposal-mapper.spec.ts
```

Expected: ALL PASS

- [ ] **Step 5: Run full core tests to catch any other broken mocks**

```bash
pnpm --filter @repo/core test
```

Expected: ALL PASS. If any test has a Proposal.restore() call missing `renewalPolicyNumber`, add `renewalPolicyNumber: null` to those test fixtures.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts packages/core/src/modules/proposal/infrastructure/proposal-mapper.spec.ts
git commit -m "feat(core): map renewalPolicyNumber in ProposalMapper"
```

---

### Task 6: Backend — Route Schemas

**Files:**

- Modify: `apps/server/src/routes/v1/proposals/_schemas.ts`

- [ ] **Step 1: Add `renewalPolicyNumber` to create body**

In `apps/server/src/routes/v1/proposals/_schemas.ts`, add to `createNewInsuranceOrRenewalProposalBody` (line 43):

```typescript
const createNewInsuranceOrRenewalProposalBody = z.object({
  clientId: z.string().min(1),
  branch: branchEnum,
  boardType: z.enum(['NEW_INSURANCE', 'RENEWAL']),
  renewalPolicyId: z.string().optional(),
  renewalPolicyNumber: z.string().optional(),
  insurerId: z.string().optional(),
})
```

- [ ] **Step 2: Add `renewalPolicyNumber` to response schema**

In the `proposalDataSchema` (line 197), add after `renewalPolicyId` (line 209):

```typescript
  renewalPolicyId: z.string().nullable(),
  renewalPolicyNumber: z.string().nullable(),
```

- [ ] **Step 3: Verify typecheck**

```bash
pnpm --filter @app/server exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/proposals/_schemas.ts
git commit -m "feat(server): add renewalPolicyNumber to proposal schemas"
```

---

### Task 7: Frontend — Regenerate API Client

**Files:**

- Modified automatically: `apps/web/src/api/endpoints/proposals/` (Orval output)

- [ ] **Step 1: Start the server (if not running)**

```bash
pnpm --filter @app/server dev &
```

Wait for server to be listening on :3001.

- [ ] **Step 2: Regenerate API client**

```bash
pnpm --filter @app/web generate:api
```

Expected: Orval regenerates hooks, types, and Zod schemas. The `CreateProposalBody` Zod schema and response types should now include `renewalPolicyNumber`.

- [ ] **Step 3: Verify the generated types include `renewalPolicyNumber`**

Check that `apps/web/src/api/endpoints/proposals/proposals.zod.ts` now contains `renewalPolicyNumber` in both request body and response schemas.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/
git commit -m "chore(web): regenerate API client with renewalPolicyNumber"
```

---

### Task 8: Frontend — RenewalPolicyInput Component

**Files:**

- Create: `apps/web/src/features/proposals/components/renewal-policy-input.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/features/proposals/components/renewal-policy-input.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

import { useDebounce } from '@/hooks/use-debounce'
import { useListPolicies } from '@/api/endpoints/policies/policies'
import { ListPoliciesStatus } from '@/api/model/listPoliciesStatus'

interface RenewalPolicyInputProps {
  readonly value: string
  readonly onChange: (value: string) => void
}

export function RenewalPolicyInput({
  value,
  onChange,
}: RenewalPolicyInputProps) {
  const [matchedClient, setMatchedClient] = useState<string | null>(null)
  const debouncedValue = useDebounce(value, 300)
  const enabled = debouncedValue.length >= 2

  const { data, isLoading } = useListPolicies(
    { search: debouncedValue, limit: 1, status: ListPoliciesStatus.ACTIVE },
    {
      query: {
        enabled,
        select: (r) => r.data.data,
      },
    }
  )

  useEffect(() => {
    if (!enabled || isLoading) {
      setMatchedClient(null)
      return
    }

    const match = data?.find(
      (p) => p.policyNumber.toLowerCase() === debouncedValue.toLowerCase()
    )
    setMatchedClient(match?.clientName ?? null)
  }, [data, debouncedValue, enabled, isLoading])

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          placeholder="Ex: 0000-0000-0000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isLoading && enabled && (
          <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>
      {matchedClient && (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
          >
            <CheckCircle2 className="mr-1 size-3" />
            Apólice vinculada
          </Badge>
          <span className="text-muted-foreground text-xs">{matchedClient}</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no lint errors**

```bash
pnpm --filter @app/web exec eslint src/features/proposals/components/renewal-policy-input.tsx
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/renewal-policy-input.tsx
git commit -m "feat(web): add RenewalPolicyInput component"
```

---

### Task 9: Frontend — Swap Component in ProposalForm

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-form.tsx`

- [ ] **Step 1: Replace PolicySearch import with RenewalPolicyInput**

In `apps/web/src/features/proposals/components/proposal-form.tsx`, replace the import (line 34):

```typescript
import { RenewalPolicyInput } from './renewal-policy-input'
```

Remove the `PolicySearch` import line.

- [ ] **Step 2: Replace the Controller block for renewalPolicyId**

Replace the renewal block (lines 174-193) with:

```tsx
{
  boardType === 'RENEWAL' && (
    <Controller
      control={form.control}
      name="renewalPolicyNumber"
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label>Nº da apólice anterior</Label>
          <RenewalPolicyInput
            value={field.value ?? ''}
            onChange={field.onChange}
          />
          {fieldState.error?.message ? (
            <p className="text-destructive text-sm">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  )
}
```

- [ ] **Step 3: Verify no lint/type errors**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

Expected: no errors (the `renewalPolicyNumber` field is in the generated Zod schema from Task 7).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/proposals/components/proposal-form.tsx
git commit -m "feat(web): swap PolicySearch for RenewalPolicyInput in proposal form"
```

---

### Task 10: Frontend — Show `renewalPolicyNumber` in Proposal Detail

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx`

- [ ] **Step 1: Update the renewal section**

In `apps/web/src/features/proposals/components/proposal-detail.tsx`, find the renewal block (lines 304-306):

```tsx
{
  proposal.renewalPolicyId && (
    <RenewalPolicyCard policyId={proposal.renewalPolicyId} />
  )
}
```

Replace with:

```tsx
{
  proposal.renewalPolicyId ? (
    <RenewalPolicyCard policyId={proposal.renewalPolicyId} />
  ) : proposal.renewalPolicyNumber ? (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <RefreshCw className="size-4" />
          Apólice Anterior
        </CardTitle>
      </CardHeader>
      <CardPanel>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{proposal.renewalPolicyNumber}</p>
          <Badge variant="secondary" className="text-xs">
            Não vinculada
          </Badge>
        </div>
      </CardPanel>
    </Card>
  ) : null
}
```

- [ ] **Step 2: Ensure required imports exist**

Verify `proposal-detail.tsx` already imports `Card`, `CardHeader`, `CardPanel`, `CardTitle`, `Badge`, and `RefreshCw`. If `RefreshCw` is not imported (it's used in `RenewalPolicyCard` but may not be in `proposal-detail.tsx`), add it:

```typescript
import { RefreshCw } from 'lucide-react'
```

Same for `Badge` — check if already imported, add if missing:

```typescript
import { Badge } from '@/components/ui/badge'
```

- [ ] **Step 3: Verify no type errors**

```bash
pnpm --filter @app/web exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/proposals/components/proposal-detail.tsx
git commit -m "feat(web): show renewalPolicyNumber in proposal detail"
```

---

### Task 11: Quality Gates

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: zero errors

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: all pass

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: successful build

- [ ] **Step 5: Fix any issues found, then re-run the failing gate**

If any gate fails, fix the issue and re-run only the failing command. Do not proceed until all 4 gates pass.
