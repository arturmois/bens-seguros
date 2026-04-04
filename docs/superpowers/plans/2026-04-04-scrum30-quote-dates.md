# SCRUM-30: Quote Dates & Email Sending — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add coverage/process date fields to proposals and enable quote PDF email sending via BullMQ worker + Resend.

**Architecture:** Five new nullable date fields on Proposal. New PATCH route for dates, new POST route for send-quote that generates PDF (reusing existing template) and enqueues an email job. Worker downloads PDF from storage and sends via Resend with attachment. Frontend shows date section + send button with confirmation dialog.

**Tech Stack:** Prisma 7, Fastify 5, BullMQ 5, Resend 6, @react-pdf/renderer 4, React 19, Next.js 16, React Query (Orval), shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-scrum30-quote-dates-design.md`

---

## File Map

| Action | File                                                                             | Responsibility                            |
| ------ | -------------------------------------------------------------------------------- | ----------------------------------------- |
| Modify | `packages/db/prisma/schema.prisma`                                               | Add 5 date fields to Proposal model       |
| Modify | `packages/core/src/modules/proposal/domain/proposal.ts`                          | Add date props, methods, getters          |
| Modify | `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`           | Map 5 new fields                          |
| Modify | `packages/core/src/modules/proposal/application/create-proposal.ts`              | Set quoteValidUntil default               |
| Modify | `packages/core/src/modules/proposal/application/create-proposal.spec.ts`         | Test default quoteValidUntil              |
| Create | `packages/core/src/modules/proposal/application/update-proposal-dates.ts`        | Use case for PATCH dates                  |
| Create | `packages/core/src/modules/proposal/application/update-proposal-dates.spec.ts`   | Tests for date updates                    |
| Create | `packages/core/src/modules/proposal/application/send-quote.ts`                   | Use case: validate + enqueue              |
| Create | `packages/core/src/modules/proposal/application/send-quote.spec.ts`              | Tests for send-quote                      |
| Modify | `packages/core/src/modules/notification/domain/email-provider.ts`                | Add attachments + replyTo to EmailPayload |
| Modify | `packages/core/src/modules/notification/infrastructure/resend-email-provider.ts` | Support attachments + replyTo             |
| Create | `packages/core/src/modules/notification/templates/quote-sent-email.ts`           | HTML template for quote email             |
| Modify | `apps/server/src/routes/v1/proposals/_schemas.ts`                                | Add date fields to schemas                |
| Create | `apps/server/src/routes/v1/proposals/update-proposal-dates.ts`                   | PATCH /proposals/:id/dates                |
| Create | `apps/server/src/routes/v1/proposals/send-quote.ts`                              | POST /proposals/:id/send-quote            |
| Create | `apps/server/src/services/send-quote-enqueuer.ts`                                | Enqueue SEND_QUOTE_EMAIL job              |
| Modify | `apps/server/src/routes/v1/proposals/index.ts`                                   | Register new routes                       |
| Modify | `apps/server/src/pdf-templates/proposal-quote-pdf.tsx`                           | Use real date fields                      |
| Create | `apps/worker/src/processors/send-quote-email-processor.ts`                       | Download PDF + send email                 |
| Modify | `apps/worker/src/index.ts`                                                       | Register new processor                    |
| Modify | `apps/web/src/features/proposals/components/proposal-detail.tsx`                 | Dates section + send button               |
| Create | `apps/web/src/features/proposals/components/send-quote-dialog.tsx`               | Confirmation dialog                       |
| Create | `apps/web/src/features/proposals/hooks/use-send-quote.ts`                        | Mutation hook                             |
| Create | `apps/web/src/features/proposals/hooks/use-update-proposal-dates.ts`             | Mutation hook for dates                   |
| Modify | `apps/web/src/features/proposals/components/proposal-kanban.tsx`                 | Show coverage date on card                |

---

### Task 1: Prisma Schema — Add 5 Date Fields

**Files:**

- Modify: `packages/db/prisma/schema.prisma:302-339`

- [ ] **Step 1: Add date fields to Proposal model**

In `packages/db/prisma/schema.prisma`, add after the `insurerId` field (before `details`):

```prisma
  coverageStartDate           DateTime?
  coverageEndDate             DateTime?
  sentToClientAt              DateTime?
  clientResponseAt            DateTime?
  quoteValidUntil             DateTime?
```

- [ ] **Step 2: Push schema to dev database**

```bash
pnpm --filter @repo/db exec prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm --filter @repo/db exec prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): add quote date fields to Proposal model (SCRUM-30)"
```

---

### Task 2: Domain Entity — Add Date Properties and Methods (TDD)

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal.ts`
- Create: `packages/core/src/modules/proposal/domain/proposal-dates.spec.ts`

- [ ] **Step 1: Write failing tests for date methods**

Create `packages/core/src/modules/proposal/domain/proposal-dates.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { Proposal } from './proposal.js'

function createTestProposal(overrides: Record<string, unknown> = {}) {
  return Proposal.restore({
    id: 'p-1',
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 100000,
    commissionPercentageInCents: 1500,
    details: null,
    lostReason: null,
    renewalPolicyId: null,
    sourcePolicyId: null,
    endorsementType: null,
    endorsementReason: null,
    sourcePolicySnapshot: null,
    insurerId: null,
    deletedAt: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    coverageStartDate: null,
    coverageEndDate: null,
    sentToClientAt: null,
    clientResponseAt: null,
    quoteValidUntil: null,
    ...overrides,
  })
}

describe('Proposal date methods', () => {
  it('updates coverage dates when end is after start', () => {
    const proposal = createTestProposal()
    const start = new Date('2026-05-01')
    const end = new Date('2027-05-01')

    proposal.updateCoverageDates(start, end)

    expect(proposal.coverageStartDate).toEqual(start)
    expect(proposal.coverageEndDate).toEqual(end)
  })

  it('rejects coverage dates when end is before start', () => {
    const proposal = createTestProposal()

    expect(() =>
      proposal.updateCoverageDates(
        new Date('2027-05-01'),
        new Date('2026-05-01')
      )
    ).toThrow('Data de fim deve ser posterior à data de início')
  })

  it('marks proposal as sent to client', () => {
    const proposal = createTestProposal()

    proposal.markAsSentToClient()

    expect(proposal.sentToClientAt).toBeInstanceOf(Date)
  })

  it('overwrites sentToClientAt on resend', () => {
    const original = new Date('2026-03-01')
    const proposal = createTestProposal({ sentToClientAt: original })

    proposal.markAsSentToClient()

    expect(proposal.sentToClientAt).not.toEqual(original)
  })

  it('updates client response date', () => {
    const proposal = createTestProposal()
    const date = new Date('2026-04-10')

    proposal.updateClientResponse(date)

    expect(proposal.clientResponseAt).toEqual(date)
  })

  it('updates quote validity date', () => {
    const proposal = createTestProposal()
    const date = new Date('2026-05-01')

    proposal.updateQuoteValidity(date)

    expect(proposal.quoteValidUntil).toEqual(date)
  })

  it('returns true for isQuoteExpired when past validity', () => {
    const proposal = createTestProposal({
      quoteValidUntil: new Date('2020-01-01'),
    })

    expect(proposal.isQuoteExpired).toBe(true)
  })

  it('returns false for isQuoteExpired when before validity', () => {
    const proposal = createTestProposal({
      quoteValidUntil: new Date('2099-12-31'),
    })

    expect(proposal.isQuoteExpired).toBe(false)
  })

  it('returns false for isQuoteExpired when no validity set', () => {
    const proposal = createTestProposal({ quoteValidUntil: null })

    expect(proposal.isQuoteExpired).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/proposal-dates.spec.ts
```

Expected: FAIL — properties and methods don't exist yet.

- [ ] **Step 3: Add date properties to ProposalProps and CreateProposalInput**

In `packages/core/src/modules/proposal/domain/proposal.ts`:

Add to `ProposalProps` interface (after `updatedAt`):

```typescript
coverageStartDate: Date | null
coverageEndDate: Date | null
sentToClientAt: Date | null
clientResponseAt: Date | null
quoteValidUntil: Date | null
```

Add to `CreateProposalInput` interface:

```typescript
  quoteValidUntil?: Date
```

- [ ] **Step 4: Update `Proposal.create()` to include date fields**

In the `Proposal.create()` static method, add to the props object:

```typescript
      coverageStartDate: null,
      coverageEndDate: null,
      sentToClientAt: null,
      clientResponseAt: null,
      quoteValidUntil: input.quoteValidUntil ?? null,
```

- [ ] **Step 5: Add domain methods**

Add these methods to the `Proposal` class (before getters):

```typescript
  updateCoverageDates(start: Date, end: Date): void {
    if (end <= start) {
      throw ProposalErrors.invalidCoverageDates()
    }
    this.props.coverageStartDate = start
    this.props.coverageEndDate = end
    this.props.updatedAt = new Date()
  }

  markAsSentToClient(): void {
    this.props.sentToClientAt = new Date()
    this.props.updatedAt = new Date()
  }

  updateClientResponse(date: Date): void {
    this.props.clientResponseAt = date
    this.props.updatedAt = new Date()
  }

  updateQuoteValidity(date: Date): void {
    this.props.quoteValidUntil = date
    this.props.updatedAt = new Date()
  }
```

- [ ] **Step 6: Add getters**

Add these getters alongside existing ones:

```typescript
  get coverageStartDate(): Date | null {
    return this.props.coverageStartDate
  }
  get coverageEndDate(): Date | null {
    return this.props.coverageEndDate
  }
  get sentToClientAt(): Date | null {
    return this.props.sentToClientAt
  }
  get clientResponseAt(): Date | null {
    return this.props.clientResponseAt
  }
  get quoteValidUntil(): Date | null {
    return this.props.quoteValidUntil
  }
  get isQuoteExpired(): boolean {
    return this.props.quoteValidUntil !== null && this.props.quoteValidUntil < new Date()
  }
```

- [ ] **Step 7: Add error to ProposalErrors**

In `packages/core/src/modules/proposal/domain/proposal-errors.ts`, add:

```typescript
  static invalidCoverageDates(): DomainError {
    return new DomainError(
      'INVALID_COVERAGE_DATES',
      'Data de fim deve ser posterior à data de início'
    )
  }
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/proposal-dates.spec.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/modules/proposal/domain/
git commit -m "feat(core): add date properties and methods to Proposal entity (SCRUM-30)"
```

---

### Task 3: Mapper + Create Proposal Default

**Files:**

- Modify: `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`
- Modify: `packages/core/src/modules/proposal/application/create-proposal.ts`
- Modify: `packages/core/src/modules/proposal/application/create-proposal.spec.ts`

- [ ] **Step 1: Write failing test for quoteValidUntil default**

Add to `packages/core/src/modules/proposal/application/create-proposal.spec.ts`:

```typescript
it('sets quoteValidUntil to 15 days from creation', async () => {
  const repo = createMockRepo()
  const checklistRepo = createMockChecklistRepo()
  const checklistConfig = createMockChecklistConfig()
  const useCase = new CreateProposal(
    repo,
    checklistRepo,
    checklistConfig,
    createMockPolicyRepo()
  )

  const result = await useCase.execute({
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'NEW_INSURANCE',
  })

  expect(result.quoteValidUntil).toBeInstanceOf(Date)
  const diffMs = result.quoteValidUntil!.getTime() - result.createdAt.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  expect(diffDays).toBe(15)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/create-proposal.spec.ts
```

Expected: FAIL — `quoteValidUntil` is null.

- [ ] **Step 3: Update mapper — toDomain**

In `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`, add to the `toDomain` method's `Proposal.restore({...})` call, after `updatedAt`:

```typescript
      coverageStartDate: row.coverageStartDate,
      coverageEndDate: row.coverageEndDate,
      sentToClientAt: row.sentToClientAt,
      clientResponseAt: row.clientResponseAt,
      quoteValidUntil: row.quoteValidUntil,
```

- [ ] **Step 4: Update mapper — toPersistence**

In the `toPersistence` method, add to the return object after `updatedAt`:

```typescript
      coverageStartDate: json.coverageStartDate,
      coverageEndDate: json.coverageEndDate,
      sentToClientAt: json.sentToClientAt,
      clientResponseAt: json.clientResponseAt,
      quoteValidUntil: json.quoteValidUntil,
```

Also update the return type — remove `'coverageStartDate' | 'coverageEndDate' | 'sentToClientAt' | 'clientResponseAt' | 'quoteValidUntil'` from the Omit if they appear, or just ensure they're not omitted. The existing Omit is `Omit<ProposalProps, 'deletedAt' | 'details' | 'sourcePolicySnapshot'>` which is fine — the new fields pass through as-is.

- [ ] **Step 5: Update CreateProposal use case — set default quoteValidUntil**

In `packages/core/src/modules/proposal/application/create-proposal.ts`, in the `execute` method, after `const proposal = ...` and before `await this.proposalRepo.save(proposal)`:

```typescript
const validity = new Date(proposal.createdAt)
validity.setDate(validity.getDate() + 15)
proposal.updateQuoteValidity(validity)
```

Apply the same logic in both the regular and endorsement paths — add after `Proposal.create(dto)` in the regular path and after `return Proposal.create({...})` in the `createEndorsementProposal` method. For endorsement, set it before returning:

```typescript
  private async createEndorsementProposal(
    dto: Extract<CreateProposalDTO, { boardType: 'ENDORSEMENT' }>
  ): Promise<Proposal> {
    // ... existing code ...

    const proposal = Proposal.create({
      // ... existing props ...
    })

    const validity = new Date(proposal.createdAt)
    validity.setDate(validity.getDate() + 15)
    proposal.updateQuoteValidity(validity)

    return proposal
  }
```

And update the main `execute` to also set it:

```typescript
  async execute(dto: CreateProposalDTO): Promise<Proposal> {
    const proposal =
      dto.boardType === 'ENDORSEMENT'
        ? await this.createEndorsementProposal(dto)
        : Proposal.create(dto)

    if (!proposal.quoteValidUntil) {
      const validity = new Date(proposal.createdAt)
      validity.setDate(validity.getDate() + 15)
      proposal.updateQuoteValidity(validity)
    }

    await this.proposalRepo.save(proposal)
    // ... rest unchanged
  }
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/create-proposal.spec.ts
```

Expected: All tests PASS, including the new one.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/modules/proposal/
git commit -m "feat(core): update mapper and create-proposal with quoteValidUntil default (SCRUM-30)"
```

---

### Task 4: Update Proposal Dates Use Case (TDD)

**Files:**

- Create: `packages/core/src/modules/proposal/application/update-proposal-dates.ts`
- Create: `packages/core/src/modules/proposal/application/update-proposal-dates.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/modules/proposal/application/update-proposal-dates.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { UpdateProposalDates } from './update-proposal-dates.js'

function createMockRepo(proposal: Proposal | null = null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  }
}

function createTestProposal(): Proposal {
  return Proposal.restore({
    id: 'p-1',
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 100000,
    commissionPercentageInCents: 1500,
    details: null,
    lostReason: null,
    renewalPolicyId: null,
    sourcePolicyId: null,
    endorsementType: null,
    endorsementReason: null,
    sourcePolicySnapshot: null,
    insurerId: null,
    deletedAt: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    coverageStartDate: null,
    coverageEndDate: null,
    sentToClientAt: null,
    clientResponseAt: null,
    quoteValidUntil: new Date('2026-04-16'),
  })
}

describe('UpdateProposalDates', () => {
  it('updates coverage dates', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)

    const result = await useCase.execute('p-1', 'org-1', {
      coverageStartDate: new Date('2026-05-01'),
      coverageEndDate: new Date('2027-05-01'),
    })

    expect(result.coverageStartDate).toEqual(new Date('2026-05-01'))
    expect(result.coverageEndDate).toEqual(new Date('2027-05-01'))
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('updates clientResponseAt', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)

    const result = await useCase.execute('p-1', 'org-1', {
      clientResponseAt: new Date('2026-04-10'),
    })

    expect(result.clientResponseAt).toEqual(new Date('2026-04-10'))
  })

  it('updates quoteValidUntil', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)

    const result = await useCase.execute('p-1', 'org-1', {
      quoteValidUntil: new Date('2026-06-01'),
    })

    expect(result.quoteValidUntil).toEqual(new Date('2026-06-01'))
  })

  it('rejects invalid coverage dates', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)

    await expect(
      useCase.execute('p-1', 'org-1', {
        coverageStartDate: new Date('2027-01-01'),
        coverageEndDate: new Date('2026-01-01'),
      })
    ).rejects.toThrow('Data de fim deve ser posterior à data de início')
  })

  it('throws when proposal not found', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateProposalDates(repo)

    await expect(
      useCase.execute('p-999', 'org-1', {
        quoteValidUntil: new Date('2026-06-01'),
      })
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/update-proposal-dates.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement UpdateProposalDates use case**

Create `packages/core/src/modules/proposal/application/update-proposal-dates.ts`:

```typescript
import { inject, injectable } from 'tsyringe'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type { Proposal } from '../domain/proposal.js'

interface UpdateProposalDatesDTO {
  coverageStartDate?: Date
  coverageEndDate?: Date
  clientResponseAt?: Date
  quoteValidUntil?: Date
}

@injectable()
export class UpdateProposalDates {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(
    proposalId: string,
    organizationId: string,
    dto: UpdateProposalDatesDTO
  ): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )

    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }

    if (
      dto.coverageStartDate !== undefined &&
      dto.coverageEndDate !== undefined
    ) {
      proposal.updateCoverageDates(dto.coverageStartDate, dto.coverageEndDate)
    } else if (
      dto.coverageStartDate !== undefined ||
      dto.coverageEndDate !== undefined
    ) {
      const start = dto.coverageStartDate ?? proposal.coverageStartDate
      const end = dto.coverageEndDate ?? proposal.coverageEndDate
      if (start && end) {
        proposal.updateCoverageDates(start, end)
      }
    }

    if (dto.clientResponseAt !== undefined) {
      proposal.updateClientResponse(dto.clientResponseAt)
    }

    if (dto.quoteValidUntil !== undefined) {
      proposal.updateQuoteValidity(dto.quoteValidUntil)
    }

    await this.proposalRepo.save(proposal)
    return proposal
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/update-proposal-dates.spec.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Export from core**

Add `UpdateProposalDates` to `packages/core/src/index.ts` exports (or the proposal module barrel export).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/proposal/application/update-proposal-dates*
git commit -m "feat(core): add UpdateProposalDates use case (SCRUM-30)"
```

---

### Task 5: Send Quote Use Case (TDD)

**Files:**

- Create: `packages/core/src/modules/proposal/application/send-quote.ts`
- Create: `packages/core/src/modules/proposal/application/send-quote.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/modules/proposal/application/send-quote.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { SendQuote } from './send-quote.js'

function createMockRepo(proposal: Proposal | null = null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  }
}

function createTestProposal(overrides: Record<string, unknown> = {}): Proposal {
  return Proposal.restore({
    id: 'p-1',
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 100000,
    commissionPercentageInCents: 1500,
    details: null,
    lostReason: null,
    renewalPolicyId: null,
    sourcePolicyId: null,
    endorsementType: null,
    endorsementReason: null,
    sourcePolicySnapshot: null,
    insurerId: null,
    deletedAt: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    coverageStartDate: null,
    coverageEndDate: null,
    sentToClientAt: null,
    clientResponseAt: null,
    quoteValidUntil: new Date('2026-04-16'),
    ...overrides,
  })
}

describe('SendQuote', () => {
  it('validates that client has email and returns proposal', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new SendQuote(repo)

    const result = await useCase.validate('p-1', 'org-1', 'client@test.com')

    expect(result).toBe(proposal)
  })

  it('rejects when proposal not found', async () => {
    const repo = createMockRepo(null)
    const useCase = new SendQuote(repo)

    await expect(
      useCase.validate('p-999', 'org-1', 'client@test.com')
    ).rejects.toThrow()
  })

  it('rejects when client has no email', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new SendQuote(repo)

    await expect(useCase.validate('p-1', 'org-1', null)).rejects.toThrow(
      'Cliente não possui e-mail cadastrado'
    )
  })

  it('rejects when proposal is LOST', async () => {
    const proposal = createTestProposal({ stage: 'LOST' })
    const repo = createMockRepo(proposal)
    const useCase = new SendQuote(repo)

    await expect(
      useCase.validate('p-1', 'org-1', 'client@test.com')
    ).rejects.toThrow('Não é possível enviar cotação para proposta perdida')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/send-quote.spec.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement SendQuote use case**

Create `packages/core/src/modules/proposal/application/send-quote.ts`:

```typescript
import { inject, injectable } from 'tsyringe'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type { Proposal } from '../domain/proposal.js'

@injectable()
export class SendQuote {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async validate(
    proposalId: string,
    organizationId: string,
    clientEmail: string | null
  ): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(
      proposalId,
      organizationId
    )

    if (!proposal) {
      throw ProposalErrors.notFound(proposalId)
    }

    if (!clientEmail) {
      throw ProposalErrors.clientHasNoEmail()
    }

    if (proposal.stage === 'LOST') {
      throw ProposalErrors.cannotSendQuoteForLostProposal()
    }

    return proposal
  }
}
```

- [ ] **Step 4: Add error methods to ProposalErrors**

In `packages/core/src/modules/proposal/domain/proposal-errors.ts`:

```typescript
  static clientHasNoEmail(): DomainError {
    return new DomainError(
      'CLIENT_NO_EMAIL',
      'Cliente não possui e-mail cadastrado'
    )
  }

  static cannotSendQuoteForLostProposal(): DomainError {
    return new DomainError(
      'CANNOT_SEND_LOST_QUOTE',
      'Não é possível enviar cotação para proposta perdida'
    )
  }
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/send-quote.spec.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Export from core**

Add `SendQuote` to core exports.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/modules/proposal/
git commit -m "feat(core): add SendQuote validation use case (SCRUM-30)"
```

---

### Task 6: Email Provider — Add Attachment and ReplyTo Support

**Files:**

- Modify: `packages/core/src/modules/notification/domain/email-provider.ts`
- Modify: `packages/core/src/modules/notification/infrastructure/resend-email-provider.ts`

- [ ] **Step 1: Update EmailPayload interface**

In `packages/core/src/modules/notification/domain/email-provider.ts`:

```typescript
export interface EmailAttachment {
  readonly filename: string
  readonly content: Buffer
}

export interface EmailPayload {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly replyTo?: string
  readonly attachments?: readonly EmailAttachment[]
}

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>
}
```

- [ ] **Step 2: Update ResendEmailProvider to pass attachments and replyTo**

In `packages/core/src/modules/notification/infrastructure/resend-email-provider.ts`, update the `send` method:

```typescript
  async send(payload: EmailPayload): Promise<void> {
    await this.client.emails.send({
      from: this.fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
            })),
          }
        : {}),
    })
  }
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/notification/
git commit -m "feat(core): add attachment and replyTo support to EmailProvider (SCRUM-30)"
```

---

### Task 7: Quote Email HTML Template

**Files:**

- Create: `packages/core/src/modules/notification/templates/quote-sent-email.ts`

- [ ] **Step 1: Create quote email template**

Create `packages/core/src/modules/notification/templates/quote-sent-email.ts`:

```typescript
interface QuoteSentEmailParams {
  readonly clientName: string
  readonly salespersonName: string
  readonly organizationName: string
  readonly branch: string
  readonly premiumFormatted: string
}

export function quoteSentEmailHtml(params: QuoteSentEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Cotação de Seguro</h2>
  <p>Prezado(a) ${params.clientName},</p>
  <p>Segue em anexo a cotação de seguro <strong>${params.branch}</strong> conforme solicitado.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Ramo</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${params.branch}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Prêmio Total</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${params.premiumFormatted}</td>
    </tr>
  </table>
  <p>Para dúvidas ou aceite, responda este e-mail diretamente.</p>
  <p>Atenciosamente,<br><strong>${params.salespersonName}</strong><br>${params.organizationName}</p>
</body>
</html>`
}
```

- [ ] **Step 2: Export from notification module**

Add to the notification module's barrel export.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/notification/templates/
git commit -m "feat(core): add quote sent email HTML template (SCRUM-30)"
```

---

### Task 8: API Schemas and Routes

**Files:**

- Modify: `apps/server/src/routes/v1/proposals/_schemas.ts`
- Create: `apps/server/src/routes/v1/proposals/update-proposal-dates.ts`
- Create: `apps/server/src/routes/v1/proposals/send-quote.ts`
- Create: `apps/server/src/services/send-quote-enqueuer.ts`
- Modify: `apps/server/src/routes/v1/proposals/index.ts`

- [ ] **Step 1: Update API schemas**

In `apps/server/src/routes/v1/proposals/_schemas.ts`:

Add to `proposalDataSchema` (after `updatedAt`):

```typescript
  coverageStartDate: z.coerce.date().nullable(),
  coverageEndDate: z.coerce.date().nullable(),
  sentToClientAt: z.coerce.date().nullable(),
  clientResponseAt: z.coerce.date().nullable(),
  quoteValidUntil: z.coerce.date().nullable(),
```

Add new schemas:

```typescript
export const updateProposalDatesBody = z
  .object({
    coverageStartDate: z.coerce.date().optional(),
    coverageEndDate: z.coerce.date().optional(),
    clientResponseAt: z.coerce.date().optional(),
    quoteValidUntil: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.coverageStartDate && data.coverageEndDate) {
        return data.coverageEndDate > data.coverageStartDate
      }
      return true
    },
    { message: 'Data de fim deve ser posterior à data de início' }
  )

export const sendQuoteResponse = z.object({
  success: z.literal(true),
  data: z.object({ message: z.string() }),
})
```

- [ ] **Step 2: Create send-quote-enqueuer service**

Create `apps/server/src/services/send-quote-enqueuer.ts`:

```typescript
import { env } from '@repo/env'
import type { BulkJobOptions } from 'bullmq'
import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'send-quote-enqueuer' })

export interface SendQuoteEmailJobData {
  proposalId: string
  organizationId: string
  storageKey: string
  recipientEmail: string
  recipientName: string
  salespersonName: string
  salespersonEmail: string | null
  organizationName: string
  branch: string
  premiumFormatted: string
}

const DEFAULT_JOB_OPTIONS: BulkJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

let sendQuoteQueue: Queue<SendQuoteEmailJobData> | null = null

function parseRedisUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
    ...(parsed.password
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
  }
}

function getQueue(): Queue<SendQuoteEmailJobData> {
  if (!sendQuoteQueue) {
    const redisInfo = parseRedisUrl(env.REDIS_URL)
    sendQuoteQueue = new Queue<SendQuoteEmailJobData>('erp-send-quote', {
      connection: {
        host: redisInfo.host,
        port: redisInfo.port,
        ...(redisInfo.password ? { password: redisInfo.password } : {}),
      },
    })
  }
  return sendQuoteQueue
}

export async function enqueueSendQuoteEmail(
  data: SendQuoteEmailJobData
): Promise<void> {
  try {
    await getQueue().add('send-quote-email', data, DEFAULT_JOB_OPTIONS)
  } catch (err: unknown) {
    logger.error(
      { err, proposalId: data.proposalId },
      'Failed to enqueue send-quote-email'
    )
    throw err
  }
}
```

- [ ] **Step 3: Create send-quote route**

Create `apps/server/src/routes/v1/proposals/send-quote.ts`:

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  GetProposal,
  SendQuote,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { ProposalQuotePdf } from '../../../pdf-templates/proposal-quote-pdf.js'
import { enqueueSendQuoteEmail } from '../../../services/send-quote-enqueuer.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParam, sendQuoteResponse, errorResponse } from './_schemas.js'
import { auditUpdate } from '../../../services/audit-log.js'

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function sendQuoteRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/proposals/:id/send-quote',
    schema: {
      tags: ['Proposals'],
      summary: 'Generate PDF and send quote to client via email',
      operationId: 'sendQuote',
      params: idParam,
      response: {
        202: sendQuoteResponse,
        404: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const { id } = request.params
      const organizationId = request.organizationId!

      const sendQuoteUseCase = container.resolve(SendQuote)
      const getProposalUseCase = container.resolve(GetProposal)
      const documentRepo =
        container.resolve<DocumentRepository>('DocumentRepository')
      const storage = container.resolve<StorageProvider>('StorageProvider')

      const client = await prisma.client.findFirst({
        where: {
          id: (await getProposalUseCase.execute(id, organizationId)).clientId,
          organizationId,
        },
        select: { email: true, name: true },
      })

      let proposal
      try {
        proposal = await sendQuoteUseCase.validate(
          id,
          organizationId,
          client?.email ?? null
        )
      } catch (error) {
        return handleDomainError(error, reply)
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, logo: true },
      })

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organização não encontrada',
          },
        })
      }

      let logoUrl: string | null = null
      if (org.logo) {
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      const buffer = Buffer.from(
        await renderToBuffer(
          ProposalQuotePdf({
            proposal: proposal.toJSON(),
            organization: { id: org.id, name: org.name, logo: logoUrl },
          })
        )
      )

      const storageKey = `organizations/${organizationId}/proposals/${id}/cotacao.pdf`
      await storage.upload(storageKey, buffer, 'application/pdf')

      await documentRepo.upsertByStorageKey({
        organizationId,
        entityType: 'PROPOSAL',
        entityId: id,
        type: 'QUOTATION_PDF',
        fileName: `cotacao-${id.slice(0, 8)}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
        createdBy: request.user!.id,
        storageKey,
      })

      const salesperson = await prisma.user.findUnique({
        where: { id: proposal.salespersonId },
        select: { name: true, email: true },
      })

      await enqueueSendQuoteEmail({
        proposalId: id,
        organizationId,
        storageKey,
        recipientEmail: client!.email!,
        recipientName: client!.name,
        salespersonName: salesperson?.name ?? org.name,
        salespersonEmail: salesperson?.email ?? null,
        organizationName: org.name,
        branch: proposal.branch,
        premiumFormatted: formatCurrency(proposal.premiumValueInCents),
      })

      auditUpdate({
        request,
        entityType: 'Proposal',
        entityId: id,
        after: { action: 'QUOTE_SENT', recipientEmail: client!.email },
      })

      return reply.status(202).send({
        success: true,
        data: { message: 'Cotação sendo enviada' },
      })
    },
  })
}
```

- [ ] **Step 4: Create update-proposal-dates route**

Create `apps/server/src/routes/v1/proposals/update-proposal-dates.ts`:

```typescript
import { container, UpdateProposalDates } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { auditUpdate } from '../../../services/audit-log.js'
import {
  idParam,
  updateProposalDatesBody,
  proposalDetailResponse,
  errorResponse,
} from './_schemas.js'

export function updateProposalDatesRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/api/v1/proposals/:id/dates',
    schema: {
      tags: ['Proposals'],
      summary: 'Update proposal date fields',
      operationId: 'updateProposalDates',
      params: idParam,
      body: updateProposalDatesBody,
      response: {
        200: proposalDetailResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateProposalDates)
      try {
        const updated = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body
        )
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: request.params.id,
          after: request.body,
        })
        return reply.send({ success: true, data: updated.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
```

- [ ] **Step 5: Register new routes**

In `apps/server/src/routes/v1/proposals/index.ts`, add imports and register:

```typescript
import { sendQuoteRoute } from './send-quote.js'
import { updateProposalDatesRoute } from './update-proposal-dates.js'
```

In the `proposalRoutes` function, add before the `getProposalRoute(app)` line (to avoid `:id` route conflict):

```typescript
sendQuoteRoute(app)
updateProposalDatesRoute(app)
```

- [ ] **Step 6: Register use cases in DI container**

Add `UpdateProposalDates` and `SendQuote` to the DI registry (likely `apps/server/src/di/registry.ts` or similar).

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes/v1/proposals/ apps/server/src/services/send-quote-enqueuer.ts
git commit -m "feat(server): add send-quote and update-dates API routes (SCRUM-30)"
```

---

### Task 9: PDF Template — Use Real Date Fields

**Files:**

- Modify: `apps/server/src/pdf-templates/proposal-quote-pdf.tsx`

- [ ] **Step 1: Update ValiditySection to use real date fields**

Replace the existing `ValiditySection` and `computeValidityDate` in `apps/server/src/pdf-templates/proposal-quote-pdf.tsx`:

Remove `QUOTE_VALIDITY_DAYS` constant and `computeValidityDate` function.

Update `ValiditySection`:

```tsx
function ValiditySection({ proposal }: { readonly proposal: ProposalProps }) {
  const validUntil = proposal.quoteValidUntil
    ? formatDate(proposal.quoteValidUntil)
    : '—'

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Validade da Cotação</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Data da Cotação</Text>
          <Text style={styles.value}>{formatDate(proposal.createdAt)}</Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Válida Até</Text>
          <Text style={styles.value}>{validUntil}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Corretor</Text>
          <Text style={styles.value}>{proposal.salespersonName ?? '—'}</Text>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 2: Add CoverageDatesSection**

Add before `ValiditySection`:

```tsx
function CoverageDatesSection({
  proposal,
}: {
  readonly proposal: ProposalProps
}) {
  if (!proposal.coverageStartDate && !proposal.coverageEndDate) {
    return null
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Vigência Proposta</Text>
      <View style={styles.row}>
        <View style={styles.col2}>
          <Text style={styles.label}>Início</Text>
          <Text style={styles.value}>
            {proposal.coverageStartDate
              ? formatDate(proposal.coverageStartDate)
              : '—'}
          </Text>
        </View>
        <View style={styles.col2}>
          <Text style={styles.label}>Fim</Text>
          <Text style={styles.value}>
            {proposal.coverageEndDate
              ? formatDate(proposal.coverageEndDate)
              : '—'}
          </Text>
        </View>
      </View>
    </View>
  )
}
```

- [ ] **Step 3: Add CoverageDatesSection to ProposalQuotePdf render**

In the `ProposalQuotePdf` component, add `<CoverageDatesSection proposal={proposal} />` after `<CoverageSection>` and before `InsuredObjectSection`.

Update `PdfFooter` validity prop:

```tsx
<PdfFooter
  salespersonName={proposal.salespersonName ?? organization.name}
  creci={organization.creci}
  validity={
    proposal.quoteValidUntil ? formatDate(proposal.quoteValidUntil) : '—'
  }
/>
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/pdf-templates/
git commit -m "feat(server): update PDF template with real date fields (SCRUM-30)"
```

---

### Task 10: Worker — Send Quote Email Processor

**Files:**

- Create: `apps/worker/src/processors/send-quote-email-processor.ts`
- Modify: `apps/worker/src/index.ts`

- [ ] **Step 1: Create processor**

Create `apps/worker/src/processors/send-quote-email-processor.ts`:

```typescript
import {
  ResendEmailProvider,
  type EmailProvider,
} from '@repo/core/notification'
import { quoteSentEmailHtml } from '@repo/core/notification'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'send-quote-email-processor' })

const QUEUE_NAME = 'erp-send-quote'

interface SendQuoteEmailJobData {
  proposalId: string
  organizationId: string
  storageKey: string
  recipientEmail: string
  recipientName: string
  salespersonName: string
  salespersonEmail: string | null
  organizationName: string
  branch: string
  premiumFormatted: string
}

export function setupSendQuoteEmailProcessor(connection: ConnectionOptions) {
  const queue = new Queue<SendQuoteEmailJobData>(QUEUE_NAME, { connection })

  let emailProvider: EmailProvider | null = null
  if (env.RESEND_API_KEY) {
    emailProvider = new ResendEmailProvider({
      apiKey: env.RESEND_API_KEY,
      fromAddress: env.RESEND_FROM_ADDRESS,
    })
  }

  const worker = new Worker<SendQuoteEmailJobData>(
    QUEUE_NAME,
    async (job: Job<SendQuoteEmailJobData>) => {
      const data = job.data

      if (!emailProvider) {
        logger.warn('No email provider configured, skipping send-quote-email')
        return
      }

      const {
        default: { createClient },
      } = await import('@repo/core')
      const storage = (await import('@repo/core')).container.resolve(
        'StorageProvider'
      )

      // Download PDF from storage
      const pdfBuffer = await (
        storage as { download(key: string): Promise<Buffer> }
      ).download(data.storageKey)

      const html = quoteSentEmailHtml({
        clientName: data.recipientName,
        salespersonName: data.salespersonName,
        organizationName: data.organizationName,
        branch: data.branch,
        premiumFormatted: data.premiumFormatted,
      })

      await emailProvider.send({
        to: data.recipientEmail,
        subject: `Cotação de Seguro — ${data.organizationName}`,
        html,
        replyTo: data.salespersonEmail ?? undefined,
        attachments: [
          {
            filename: `cotacao-${data.proposalId.slice(0, 8)}.pdf`,
            content: pdfBuffer,
          },
        ],
      })

      // Mark proposal as sent
      await prisma.proposal.update({
        where: { id: data.proposalId },
        data: { sentToClientAt: new Date() },
      })

      logger.info(
        {
          proposalId: data.proposalId,
          recipientEmail: data.recipientEmail,
        },
        'Quote email sent successfully'
      )
    },
    {
      connection,
      concurrency: 2,
      maxStalledCount: 2,
      stalledInterval: 10_000,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Send-quote-email job failed')
  })

  return { worker, queue }
}
```

> **Note for implementer:** The storage download approach depends on how `StorageProvider` is set up. If it doesn't have a `download` method, use the appropriate S3/R2 client to fetch the buffer from `storageKey`. Check the existing `StorageProvider` interface for available methods.

- [ ] **Step 2: Register processor in worker index**

In `apps/worker/src/index.ts`, add import and setup:

```typescript
import { setupSendQuoteEmailProcessor } from './processors/send-quote-email-processor.js'
```

After the existing processor setups:

```typescript
const sendQuoteEmail = setupSendQuoteEmailProcessor(connection)
```

Update the logger message:

```typescript
logger.info(
  'ERP Worker started. Active processors: audit-archive, csv-import, expire-policies, notifications, proactive-alerts, send-quote-email'
)
```

Add to graceful shutdown:

```typescript
const gracefulShutdown = async () => {
  logger.info('Shutting down worker...')
  await Promise.all([
    auditArchive.worker.close(),
    csvImport.worker.close(),
    expirePolicies.worker.close(),
    notifications.worker.close(),
    proactiveAlerts.worker.close(),
    sendQuoteEmail.worker.close(),
  ])
  await Promise.all([
    auditArchive.queue.close(),
    csvImport.queue.close(),
    expirePolicies.queue.close(),
    notifications.queue.close(),
    proactiveAlerts.queue.close(),
    sendQuoteEmail.queue.close(),
  ])
  process.exit(0)
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/worker/src/
git commit -m "feat(worker): add send-quote-email processor (SCRUM-30)"
```

---

### Task 11: Frontend — Dates Section in Proposal Detail

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx`
- Create: `apps/web/src/features/proposals/hooks/use-update-proposal-dates.ts`

- [ ] **Step 1: Regenerate Orval API client**

Start server, then:

```bash
pnpm --filter @app/web generate:api
```

This generates the new types and hooks for the updated proposal schema, `updateProposalDates`, and `sendQuote` endpoints.

- [ ] **Step 2: Create date update mutation hook**

Create `apps/web/src/features/proposals/hooks/use-update-proposal-dates.ts`:

```typescript
import { useUpdateProposalDates as useOrvalUpdateDates } from '@/api/endpoints/proposals/proposals'
import { useQueryClient } from '@tanstack/react-query'
import { getGetProposalQueryKey } from '@/api/endpoints/proposals/proposals'
import { toast } from 'sonner'

export function useUpdateProposalDates(proposalId: string) {
  const queryClient = useQueryClient()

  return useOrvalUpdateDates(proposalId, {
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetProposalQueryKey(proposalId),
        })
        toast.success('Datas atualizadas')
      },
      onError: () => {
        toast.error('Erro ao atualizar datas')
      },
    },
  })
}
```

> **Note:** The exact Orval-generated hook name may differ. Check `@/api/endpoints/proposals/proposals.ts` after regeneration for the actual function name matching `operationId: 'updateProposalDates'`.

- [ ] **Step 3: Add dates section to proposal-detail.tsx**

In `apps/web/src/features/proposals/components/proposal-detail.tsx`:

Add import:

```typescript
import { DatePicker } from '@/components/ui/date-picker'
import { useUpdateProposalDates } from '../hooks/use-update-proposal-dates'
```

After the existing grid (`<div className="grid gap-4 sm:grid-cols-2">`) that shows Cliente, Vendedor, etc., add a new section:

```tsx
      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-semibold">Datas</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem
            label="Vigência Início"
            value={
              proposal.coverageStartDate
                ? formatDate(proposal.coverageStartDate)
                : '—'
            }
          />
          <InfoItem
            label="Vigência Fim"
            value={
              proposal.coverageEndDate
                ? formatDate(proposal.coverageEndDate)
                : '—'
            }
          />
          <InfoItem
            label="Validade da Cotação"
            value={
              proposal.quoteValidUntil
                ? formatDate(proposal.quoteValidUntil)
                : '—'
            }
          />
          <InfoItem
            label="Enviada em"
            value={
              proposal.sentToClientAt
                ? formatDate(proposal.sentToClientAt)
                : '—'
            }
          />
          <InfoItem
            label="Resposta do Cliente"
            value={
              proposal.clientResponseAt
                ? formatDate(proposal.clientResponseAt)
                : '—'
            }
          />
        </div>
      </div>
```

> **Note for implementer:** The initial version uses read-only `InfoItem` display. Inline editing with DatePickers can be added as a follow-up or implemented here if the component already supports it. Check `docs/UI-PATTERNS.md` for the inline edit pattern used elsewhere.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/proposals/
git commit -m "feat(web): add dates section to proposal detail (SCRUM-30)"
```

---

### Task 12: Frontend — Send Quote Button and Dialog

**Files:**

- Create: `apps/web/src/features/proposals/components/send-quote-dialog.tsx`
- Create: `apps/web/src/features/proposals/hooks/use-send-quote.ts`
- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx`

- [ ] **Step 1: Create send-quote mutation hook**

Create `apps/web/src/features/proposals/hooks/use-send-quote.ts`:

```typescript
import { useSendQuote as useOrvalSendQuote } from '@/api/endpoints/proposals/proposals'
import { useQueryClient } from '@tanstack/react-query'
import { getGetProposalQueryKey } from '@/api/endpoints/proposals/proposals'
import { toast } from 'sonner'

export function useSendQuote(proposalId: string) {
  const queryClient = useQueryClient()

  return useOrvalSendQuote(proposalId, {
    mutation: {
      onSuccess: () => {
        toast.success('Cotação sendo enviada...')
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: getGetProposalQueryKey(proposalId),
          })
        }, 3000)
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? 'Erro ao enviar cotação'
        toast.error(message)
      },
    },
  })
}
```

- [ ] **Step 2: Create SendQuoteDialog component**

Create `apps/web/src/features/proposals/components/send-quote-dialog.tsx`:

```tsx
'use client'

import { Mail, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useSendQuote } from '../hooks/use-send-quote'

interface SendQuoteDialogProps {
  proposalId: string
  clientName: string
  clientEmail: string | null
  premiumValueInCents: number
  coverageStartDate: string | null
  sentToClientAt: string | null
  isLost: boolean
}

export function SendQuoteDialog({
  proposalId,
  clientName,
  clientEmail,
  premiumValueInCents,
  coverageStartDate,
  sentToClientAt,
  isLost,
}: SendQuoteDialogProps) {
  const sendMutation = useSendQuote(proposalId)
  const isResend = Boolean(sentToClientAt)
  const disabled = !clientEmail || isLost || sendMutation.isPending

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {sendMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Mail className="mr-2 size-4" />
          )}
          {isResend ? 'Reenviar Cotação' : 'Enviar Cotação'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isResend ? 'Reenviar cotação?' : 'Enviar cotação por e-mail?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                A cotação será enviada em PDF para <strong>{clientName}</strong>{' '}
                ({clientEmail}).
              </p>
              <div className="text-muted-foreground space-y-1 text-xs">
                <p>Prêmio: {formatCurrency(premiumValueInCents)}</p>
                {coverageStartDate && (
                  <p>Vigência: {formatDate(coverageStartDate)}</p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => sendMutation.mutate()}>
            Enviar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3: Add SendQuoteDialog to proposal-detail.tsx**

In the badges/buttons section of `proposal-detail.tsx` (after the "Gerar PDF" button), add:

```tsx
import { SendQuoteDialog } from './send-quote-dialog'
```

And in the JSX, after the PDF button:

```tsx
{
  proposal.stage !== 'CAPTURE' && proposal.stage !== 'LOST' && (
    <SendQuoteDialog
      proposalId={proposalId}
      clientName={proposal.clientName ?? 'Cliente'}
      clientEmail={proposal.clientEmail ?? null}
      premiumValueInCents={proposal.premiumValueInCents}
      coverageStartDate={proposal.coverageStartDate}
      sentToClientAt={proposal.sentToClientAt}
      isLost={proposal.stage === 'LOST'}
    />
  )
}
```

> **Note:** `clientEmail` may not be on the proposal response. Check the generated Orval types — if missing, fetch it from the client endpoint or add it to the proposal response schema on the server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/proposals/
git commit -m "feat(web): add send quote button with confirmation dialog (SCRUM-30)"
```

---

### Task 13: Frontend — Kanban Card Coverage Date

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-kanban.tsx`

- [ ] **Step 1: Add coverage date to kanban card**

In the kanban card rendering section of `proposal-kanban.tsx`, find where card info is displayed (client name, premium, etc.). Add after the existing info:

```tsx
{
  proposal.coverageStartDate && (
    <span className="text-muted-foreground text-xs">
      Vigência: {formatDate(proposal.coverageStartDate)}
    </span>
  )
}
```

Import `formatDate` if not already imported:

```typescript
import { formatDate } from '@/lib/formatters'
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/proposal-kanban.tsx
git commit -m "feat(web): show coverage start date on kanban card (SCRUM-30)"
```

---

### Task 14: Quality Gates and Final Verification

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: Zero errors.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: Zero errors.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Run build**

```bash
pnpm build
```

Expected: Successful build.

- [ ] **Step 5: Commit any remaining fixes and verify**

```bash
git log --oneline -10
```

Verify all commits are present and well-structured.
