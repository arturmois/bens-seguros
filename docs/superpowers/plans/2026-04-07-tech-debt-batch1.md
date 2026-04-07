# Technical Debt Batch 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 technical debt items: ProposalChecklistItem tenant isolation, endorsement tests (3 use cases), member tests (2 use cases), and accept-invitation use case extraction.

**Architecture:** Independent fixes — migration + RLS for tenant isolation, TDD unit tests following commission spec pattern, DDD Full module extraction for invitation acceptance.

**Tech Stack:** Prisma 7 (migration), Vitest (unit tests), tsyringe (DI), TypeScript strict

**Spec:** `docs/superpowers/specs/2026-04-07-tech-debt-batch1-design.md`

---

### Task 1: ProposalChecklistItem — Add organizationId + RLS (P2-7)

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Modify: `packages/db/prisma/rls-policies.sql`
- Modify: `packages/core/src/modules/proposal/infrastructure/prisma-checklist-repository.ts`

- [ ] **Step 1: Add organizationId to Prisma schema**

In `packages/db/prisma/schema.prisma`, find the `ProposalChecklistItem` model (around line 353). Add `organizationId` field and relation, plus update the index:

Replace:

```prisma
model ProposalChecklistItem {
  id          String    @id @default(cuid())
  proposalId  String
  itemKey     String
  label       String
  isRequired  Boolean   @default(true)
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  completedBy String?
  createdAt   DateTime  @default(now())

  proposal Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  @@unique([proposalId, itemKey])
  @@index([proposalId])
}
```

With:

```prisma
model ProposalChecklistItem {
  id             String    @id @default(cuid())
  organizationId String
  proposalId     String
  itemKey        String
  label          String
  isRequired     Boolean   @default(true)
  isCompleted    Boolean   @default(false)
  completedAt    DateTime?
  completedBy    String?
  createdAt      DateTime  @default(now())

  organization Organization @relation(fields: [organizationId], references: [id])
  proposal     Proposal     @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  @@unique([proposalId, itemKey])
  @@index([proposalId])
  @@index([organizationId, proposalId])
}
```

You will also need to add `proposalChecklistItems ProposalChecklistItem[]` to the `Organization` model's relations list.

- [ ] **Step 2: Create migration**

Run: `pnpm db:migrate --name add_org_id_to_proposal_checklist_item`

This creates the migration SQL. Before running it, edit the migration SQL to:

1. Add the column as nullable first
2. Populate from Proposal
3. Make NOT NULL

The migration SQL should contain:

```sql
-- Add column as nullable
ALTER TABLE "ProposalChecklistItem" ADD COLUMN "organizationId" TEXT;

-- Populate from parent Proposal
UPDATE "ProposalChecklistItem"
SET "organizationId" = p."organizationId"
FROM "Proposal" p
WHERE p.id = "ProposalChecklistItem"."proposalId";

-- Make NOT NULL
ALTER TABLE "ProposalChecklistItem" ALTER COLUMN "organizationId" SET NOT NULL;

-- Add FK constraint
ALTER TABLE "ProposalChecklistItem" ADD CONSTRAINT "ProposalChecklistItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add index
CREATE INDEX "ProposalChecklistItem_organizationId_proposalId_idx" ON "ProposalChecklistItem"("organizationId", "proposalId");
```

- [ ] **Step 3: Add RLS policy**

In `packages/db/prisma/rls-policies.sql`, add ProposalChecklistItem to the STRICT section.

After the line `ALTER TABLE "Insurer" ENABLE ROW LEVEL SECURITY;` (line 52), add:

```sql
ALTER TABLE "ProposalChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalChecklistItem" FORCE ROW LEVEL SECURITY;
```

After the last STRICT policy `CREATE POLICY` statement, add:

```sql
CREATE POLICY tenant_isolation ON "ProposalChecklistItem"
  USING ("organizationId" = current_setting('app.current_tenant', true));
```

Update the comment at the top (line 19) to include ProposalChecklistItem in the STRICT list and change count from 15 to 16.

Also create a new migration for the RLS:

```sql
ALTER TABLE "ProposalChecklistItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalChecklistItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ProposalChecklistItem"
  USING ("organizationId" = current_setting('app.current_tenant', true));
```

- [ ] **Step 4: Update checklist repository**

In `packages/core/src/modules/proposal/infrastructure/prisma-checklist-repository.ts`, the `createMany` method needs to accept and pass `organizationId`. Update the interface first.

In `packages/core/src/modules/proposal/domain/checklist-repository.ts`, update `createMany` signature:

```typescript
  createMany(
    proposalId: string,
    organizationId: string,
    items: Array<{ itemKey: string; label: string; isRequired: boolean }>
  ): Promise<void>
```

Then update the implementation in `prisma-checklist-repository.ts` — `createMany`:

```typescript
  async createMany(
    proposalId: string,
    organizationId: string,
    items: Array<{ itemKey: string; label: string; isRequired: boolean }>
  ): Promise<void> {
    await this.prisma.proposalChecklistItem.createMany({
      data: items.map((item) => ({
        proposalId,
        organizationId,
        itemKey: item.itemKey,
        label: item.label,
        isRequired: item.isRequired,
      })),
      skipDuplicates: true,
    })
  }
```

Fix all callers of `createMany` to pass `organizationId` — search the codebase for `createMany` calls in the proposal module and update them.

- [ ] **Step 5: Push schema and verify**

Run: `pnpm db:push:dev` (for dev) or apply the migration.
Run: `pnpm build && pnpm test`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/ packages/core/src/modules/proposal/
git commit -m "fix: add organizationId + RLS to ProposalChecklistItem (P2-7)"
```

---

### Task 2: Endorsement Tests — CreateEndorsement (P2-2)

**Files:**

- Create: `packages/core/src/modules/endorsement/application/create-endorsement.spec.ts`

- [ ] **Step 1: Write the test**

Create `packages/core/src/modules/endorsement/application/create-endorsement.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type {
  EndorsementRepository,
  CreateEndorsementInput,
  EndorsementData,
} from '../domain/endorsement-repository.js'
import { CreateEndorsement } from './create-endorsement.js'

function createMockRepo(): EndorsementRepository {
  return {
    create: vi.fn().mockImplementation(
      async (dto: CreateEndorsementInput): Promise<EndorsementData> => ({
        id: 'end-1',
        organizationId: dto.organizationId,
        policyId: dto.policyId,
        type: dto.type,
        description: dto.description,
        effectiveDate: dto.effectiveDate,
        previousVersionSnapshot: dto.previousVersionSnapshot,
        changes: dto.changes,
        createdBy: dto.createdBy ?? null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      })
    ),
    findById: vi.fn(),
    findMany: vi.fn(),
  }
}

describe('CreateEndorsement', () => {
  it('delegates to repository with correct data', async () => {
    const repo = createMockRepo()
    const useCase = new CreateEndorsement(repo)

    const input: CreateEndorsementInput = {
      organizationId: 'org-1',
      policyId: 'pol-1',
      type: 'COVERAGE_CHANGE',
      description: 'Added flood coverage',
      effectiveDate: new Date('2026-06-01'),
      previousVersionSnapshot: { coverage: 'fire' },
      changes: { coverage: 'fire+flood' },
      createdBy: 'user-1',
    }

    const result = await useCase.execute(input)

    expect(repo.create).toHaveBeenCalledTimes(1)
    expect(repo.create).toHaveBeenCalledWith(input)
    expect(result.organizationId).toBe('org-1')
    expect(result.policyId).toBe('pol-1')
    expect(result.type).toBe('COVERAGE_CHANGE')
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @repo/core exec vitest run src/modules/endorsement/application/create-endorsement.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/endorsement/application/create-endorsement.spec.ts
git commit -m "test: add CreateEndorsement unit test (P2-2)"
```

---

### Task 3: Endorsement Tests — GetEndorsement (P2-2)

**Files:**

- Create: `packages/core/src/modules/endorsement/application/get-endorsement.spec.ts`

- [ ] **Step 1: Write the test**

Create `packages/core/src/modules/endorsement/application/get-endorsement.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type {
  EndorsementRepository,
  EndorsementData,
} from '../domain/endorsement-repository.js'
import { EndorsementNotFoundError } from '../domain/endorsement-errors.js'
import { GetEndorsement } from './get-endorsement.js'

const mockEndorsement: EndorsementData = {
  id: 'end-1',
  organizationId: 'org-1',
  policyId: 'pol-1',
  type: 'COVERAGE_CHANGE',
  description: 'Added flood coverage',
  effectiveDate: new Date('2026-06-01'),
  previousVersionSnapshot: { coverage: 'fire' },
  changes: { coverage: 'fire+flood' },
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function createMockRepo(): EndorsementRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  }
}

describe('GetEndorsement', () => {
  it('returns endorsement when found', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(mockEndorsement)
    const useCase = new GetEndorsement(repo)

    const result = await useCase.execute('end-1', 'org-1')

    expect(repo.findById).toHaveBeenCalledWith('end-1', 'org-1')
    expect(result.id).toBe('end-1')
  })

  it('throws EndorsementNotFoundError when not found', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new GetEndorsement(repo)

    await expect(useCase.execute('end-999', 'org-1')).rejects.toThrow(
      EndorsementNotFoundError
    )
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @repo/core exec vitest run src/modules/endorsement/application/get-endorsement.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/endorsement/application/get-endorsement.spec.ts
git commit -m "test: add GetEndorsement unit test (P2-2)"
```

---

### Task 4: Endorsement Tests — ListEndorsements (P2-2)

**Files:**

- Create: `packages/core/src/modules/endorsement/application/list-endorsements.spec.ts`

- [ ] **Step 1: Write the test**

Create `packages/core/src/modules/endorsement/application/list-endorsements.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type {
  EndorsementRepository,
  EndorsementData,
  EndorsementFilters,
} from '../domain/endorsement-repository.js'
import { ListEndorsements } from './list-endorsements.js'

const mockEndorsement: EndorsementData = {
  id: 'end-1',
  organizationId: 'org-1',
  policyId: 'pol-1',
  type: 'COVERAGE_CHANGE',
  description: 'Added flood coverage',
  effectiveDate: new Date('2026-06-01'),
  previousVersionSnapshot: { coverage: 'fire' },
  changes: { coverage: 'fire+flood' },
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function createMockRepo(): EndorsementRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  }
}

describe('ListEndorsements', () => {
  it('returns paginated endorsements', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      data: [mockEndorsement],
      nextCursor: null,
      hasMore: false,
    })
    const useCase = new ListEndorsements(repo)

    const filters: EndorsementFilters = { organizationId: 'org-1' }
    const result = await useCase.execute(filters, { limit: 20 })

    expect(repo.findMany).toHaveBeenCalledWith(filters, { limit: 20 })
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('end-1')
  })

  it('passes policyId filter to repository', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      data: [],
      nextCursor: null,
      hasMore: false,
    })
    const useCase = new ListEndorsements(repo)

    const filters: EndorsementFilters = {
      organizationId: 'org-1',
      policyId: 'pol-1',
    }
    await useCase.execute(filters, { limit: 20 })

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ policyId: 'pol-1' }),
      { limit: 20 }
    )
  })

  it('returns empty list without error', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      data: [],
      nextCursor: null,
      hasMore: false,
    })
    const useCase = new ListEndorsements(repo)

    const result = await useCase.execute(
      { organizationId: 'org-1' },
      { limit: 20 }
    )

    expect(result.data).toHaveLength(0)
    expect(result.hasMore).toBe(false)
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @repo/core exec vitest run src/modules/endorsement/application/list-endorsements.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/endorsement/application/list-endorsements.spec.ts
git commit -m "test: add ListEndorsements unit test (P2-2)"
```

---

### Task 5: Member Tests — UpdateMemberRole (P2-2)

**Files:**

- Create: `packages/core/src/modules/member/application/update-member-role.spec.ts`

- [ ] **Step 1: Write the test**

Create `packages/core/src/modules/member/application/update-member-role.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type {
  MemberRepository,
  MemberRecord,
} from '../domain/member-repository.js'
import {
  MemberNotFoundError,
  SelfRemovalError,
  RoleHierarchyError,
  LastOwnerError,
} from '../domain/member-errors.js'
import { UpdateMemberRole } from './update-member-role.js'

const baseMember: MemberRecord = {
  id: 'mem-1',
  userId: 'user-target',
  organizationId: 'org-1',
  role: 'COMMERCIAL',
  active: true,
}

function createMockRepo(): MemberRepository {
  return {
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    deactivate: vi.fn(),
  }
}

describe('UpdateMemberRole', () => {
  it('updates role successfully', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(baseMember)
    vi.mocked(repo.updateRole).mockResolvedValue({
      ...baseMember,
      role: 'MANAGER',
    })
    const useCase = new UpdateMemberRole(repo)

    const result = await useCase.execute({
      id: 'mem-1',
      organizationId: 'org-1',
      callerUserId: 'user-admin',
      callerRole: 'ADMIN',
      newRole: 'MANAGER',
    })

    expect(repo.updateRole).toHaveBeenCalledWith('mem-1', 'org-1', 'MANAGER')
    expect(result.role).toBe('MANAGER')
  })

  it('throws MemberNotFoundError when member does not exist', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new UpdateMemberRole(repo)

    await expect(
      useCase.execute({
        id: 'mem-999',
        organizationId: 'org-1',
        callerUserId: 'user-admin',
        callerRole: 'ADMIN',
        newRole: 'MANAGER',
      })
    ).rejects.toThrow(MemberNotFoundError)
  })

  it('throws SelfRemovalError when caller tries to change own role', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      userId: 'user-self',
    })
    const useCase = new UpdateMemberRole(repo)

    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-self',
        callerRole: 'ADMIN',
        newRole: 'VIEWER',
      })
    ).rejects.toThrow(SelfRemovalError)
  })

  it('throws RoleHierarchyError when caller role is not higher than target', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      role: 'ADMIN',
    })
    const useCase = new UpdateMemberRole(repo)

    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-manager',
        callerRole: 'MANAGER',
        newRole: 'VIEWER',
      })
    ).rejects.toThrow(RoleHierarchyError)
  })

  it('throws LastOwnerError when demoting the only OWNER', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      role: 'OWNER',
    })
    vi.mocked(repo.countByRole).mockResolvedValue(1)
    const useCase = new UpdateMemberRole(repo)

    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-other-owner',
        callerRole: 'OWNER',
        newRole: 'ADMIN',
      })
    ).rejects.toThrow(LastOwnerError)
  })

  it('calls countByRole when target member is OWNER', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      role: 'OWNER',
    })
    vi.mocked(repo.countByRole).mockResolvedValue(2)
    vi.mocked(repo.updateRole).mockResolvedValue({
      ...baseMember,
      role: 'ADMIN',
    })
    const useCase = new UpdateMemberRole(repo)

    await useCase.execute({
      id: 'mem-1',
      organizationId: 'org-1',
      callerUserId: 'user-other-owner',
      callerRole: 'OWNER',
      newRole: 'ADMIN',
    })

    expect(repo.countByRole).toHaveBeenCalledWith('org-1', 'OWNER')
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @repo/core exec vitest run src/modules/member/application/update-member-role.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/member/application/update-member-role.spec.ts
git commit -m "test: add UpdateMemberRole unit test with 6 scenarios (P2-2)"
```

---

### Task 6: Member Tests — DeactivateMember (P2-2)

**Files:**

- Create: `packages/core/src/modules/member/application/deactivate-member.spec.ts`

- [ ] **Step 1: Write the test**

Create `packages/core/src/modules/member/application/deactivate-member.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type {
  MemberRepository,
  MemberRecord,
} from '../domain/member-repository.js'
import {
  MemberNotFoundError,
  SelfRemovalError,
  RoleHierarchyError,
  LastOwnerError,
} from '../domain/member-errors.js'
import { DeactivateMember } from './deactivate-member.js'

const baseMember: MemberRecord = {
  id: 'mem-1',
  userId: 'user-target',
  organizationId: 'org-1',
  role: 'COMMERCIAL',
  active: true,
}

function createMockRepo(): MemberRepository {
  return {
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    deactivate: vi.fn(),
  }
}

describe('DeactivateMember', () => {
  it('deactivates member successfully', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(baseMember)
    const useCase = new DeactivateMember(repo)

    await useCase.execute({
      id: 'mem-1',
      organizationId: 'org-1',
      callerUserId: 'user-admin',
      callerRole: 'ADMIN',
    })

    expect(repo.deactivate).toHaveBeenCalledWith('mem-1', 'org-1')
  })

  it('throws MemberNotFoundError when member does not exist', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new DeactivateMember(repo)

    await expect(
      useCase.execute({
        id: 'mem-999',
        organizationId: 'org-1',
        callerUserId: 'user-admin',
        callerRole: 'ADMIN',
      })
    ).rejects.toThrow(MemberNotFoundError)
  })

  it('throws SelfRemovalError when caller tries to deactivate self', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      userId: 'user-self',
    })
    const useCase = new DeactivateMember(repo)

    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-self',
        callerRole: 'ADMIN',
      })
    ).rejects.toThrow(SelfRemovalError)
  })

  it('throws RoleHierarchyError when caller cannot manage target role', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      role: 'ADMIN',
    })
    const useCase = new DeactivateMember(repo)

    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-manager',
        callerRole: 'MANAGER',
      })
    ).rejects.toThrow(RoleHierarchyError)
  })

  it('throws LastOwnerError when deactivating the only OWNER', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      role: 'OWNER',
    })
    vi.mocked(repo.countByRole).mockResolvedValue(1)
    const useCase = new DeactivateMember(repo)

    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-other-owner',
        callerRole: 'OWNER',
      })
    ).rejects.toThrow(LastOwnerError)
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm --filter @repo/core exec vitest run src/modules/member/application/deactivate-member.spec.ts`
Expected: PASS (5 tests)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/member/application/deactivate-member.spec.ts
git commit -m "test: add DeactivateMember unit test with 5 scenarios (P2-2)"
```

---

### Task 7: Invitation Module — Domain Layer (P2-6)

**Files:**

- Create: `packages/core/src/modules/invitation/domain/invitation-errors.ts`
- Create: `packages/core/src/modules/invitation/domain/invitation-repository.ts`

- [ ] **Step 1: Create invitation error classes**

Create `packages/core/src/modules/invitation/domain/invitation-errors.ts`:

```typescript
export class InvitationNotFoundError extends Error {
  readonly code = 'INVITATION_NOT_FOUND' as const
  constructor(id: string) {
    super(`Invitation ${id} not found`)
    this.name = 'InvitationNotFoundError'
  }
}

export class InvitationExpiredError extends Error {
  readonly code = 'INVITATION_EXPIRED' as const
  constructor(id: string) {
    super(`Invitation ${id} has expired`)
    this.name = 'InvitationExpiredError'
  }
}

export class InvitationAlreadyAcceptedError extends Error {
  readonly code = 'INVITATION_ALREADY_ACCEPTED' as const
  constructor(id: string) {
    super(`Invitation ${id} has already been accepted`)
    this.name = 'InvitationAlreadyAcceptedError'
  }
}

export class AlreadyMemberError extends Error {
  readonly code = 'ALREADY_MEMBER' as const
  constructor(userId: string, organizationId: string) {
    super(
      `User ${userId} is already a member of organization ${organizationId}`
    )
    this.name = 'AlreadyMemberError'
  }
}
```

- [ ] **Step 2: Create invitation repository interface**

Create `packages/core/src/modules/invitation/domain/invitation-repository.ts`:

```typescript
export interface InvitationRecord {
  readonly id: string
  readonly email: string
  readonly organizationId: string
  readonly role: string
  readonly status: string
  readonly expiresAt: Date
}

export interface AcceptInvitationResult {
  readonly organizationId: string
  readonly role: string
}

export interface InvitationRepository {
  findById(id: string): Promise<InvitationRecord | null>
  isMember(organizationId: string, userId: string): Promise<boolean>
  acceptAndCreateMember(
    invitationId: string,
    userId: string,
    organizationId: string,
    role: string
  ): Promise<void>
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/invitation/
git commit -m "feat: add invitation domain layer (errors + repository interface) (P2-6)"
```

---

### Task 8: Invitation Module — Use Case + Tests (P2-6)

**Files:**

- Create: `packages/core/src/modules/invitation/application/accept-invitation.ts`
- Create: `packages/core/src/modules/invitation/application/accept-invitation.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/core/src/modules/invitation/application/accept-invitation.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type {
  InvitationRepository,
  InvitationRecord,
} from '../domain/invitation-repository.js'
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyAcceptedError,
  AlreadyMemberError,
} from '../domain/invitation-errors.js'
import { AcceptInvitation } from './accept-invitation.js'

const validInvitation: InvitationRecord = {
  id: 'inv-1',
  email: 'new@user.com',
  organizationId: 'org-1',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date(Date.now() + 86400000),
}

function createMockRepo(): InvitationRepository {
  return {
    findById: vi.fn(),
    isMember: vi.fn(),
    acceptAndCreateMember: vi.fn(),
  }
}

describe('AcceptInvitation', () => {
  it('accepts invitation and creates member', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(validInvitation)
    vi.mocked(repo.isMember).mockResolvedValue(false)
    const useCase = new AcceptInvitation(repo)

    const result = await useCase.execute({
      invitationId: 'inv-1',
      userId: 'user-1',
    })

    expect(repo.findById).toHaveBeenCalledWith('inv-1')
    expect(repo.isMember).toHaveBeenCalledWith('org-1', 'user-1')
    expect(repo.acceptAndCreateMember).toHaveBeenCalledWith(
      'inv-1',
      'user-1',
      'org-1',
      'COMMERCIAL'
    )
    expect(result.organizationId).toBe('org-1')
    expect(result.role).toBe('COMMERCIAL')
  })

  it('throws InvitationNotFoundError when invitation does not exist', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new AcceptInvitation(repo)

    await expect(
      useCase.execute({ invitationId: 'inv-999', userId: 'user-1' })
    ).rejects.toThrow(InvitationNotFoundError)
  })

  it('throws InvitationNotFoundError when invitation is canceled', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...validInvitation,
      status: 'canceled',
    })
    const useCase = new AcceptInvitation(repo)

    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(InvitationNotFoundError)
  })

  it('throws InvitationAlreadyAcceptedError when already accepted', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...validInvitation,
      status: 'accepted',
    })
    const useCase = new AcceptInvitation(repo)

    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(InvitationAlreadyAcceptedError)
  })

  it('throws InvitationExpiredError when invitation has expired', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...validInvitation,
      expiresAt: new Date(Date.now() - 86400000),
    })
    const useCase = new AcceptInvitation(repo)

    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(InvitationExpiredError)
  })

  it('throws AlreadyMemberError when user is already a member', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(validInvitation)
    vi.mocked(repo.isMember).mockResolvedValue(true)
    const useCase = new AcceptInvitation(repo)

    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(AlreadyMemberError)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/core exec vitest run src/modules/invitation/application/accept-invitation.spec.ts`
Expected: FAIL (AcceptInvitation module not found)

- [ ] **Step 3: Implement the use case**

Create `packages/core/src/modules/invitation/application/accept-invitation.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import type {
  InvitationRepository,
  AcceptInvitationResult,
} from '../domain/invitation-repository.js'
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyAcceptedError,
  AlreadyMemberError,
} from '../domain/invitation-errors.js'

export interface AcceptInvitationInput {
  readonly invitationId: string
  readonly userId: string
}

@injectable()
export class AcceptInvitation {
  constructor(
    @inject('InvitationRepository')
    private readonly invitationRepo: InvitationRepository
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationResult> {
    const { invitationId, userId } = input

    const invitation = await this.invitationRepo.findById(invitationId)

    if (!invitation || invitation.status === 'canceled') {
      throw new InvitationNotFoundError(invitationId)
    }

    if (invitation.status === 'accepted') {
      throw new InvitationAlreadyAcceptedError(invitationId)
    }

    if (invitation.expiresAt < new Date()) {
      throw new InvitationExpiredError(invitationId)
    }

    const alreadyMember = await this.invitationRepo.isMember(
      invitation.organizationId,
      userId
    )
    if (alreadyMember) {
      throw new AlreadyMemberError(userId, invitation.organizationId)
    }

    await this.invitationRepo.acceptAndCreateMember(
      invitationId,
      userId,
      invitation.organizationId,
      invitation.role
    )

    return {
      organizationId: invitation.organizationId,
      role: invitation.role,
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/core exec vitest run src/modules/invitation/application/accept-invitation.spec.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/invitation/application/
git commit -m "feat: add AcceptInvitation use case with 6 test scenarios (P2-6)"
```

---

### Task 9: Invitation Module — Infrastructure + Exports (P2-6)

**Files:**

- Create: `packages/core/src/modules/invitation/infrastructure/prisma-invitation-repository.ts`
- Create: `packages/core/src/modules/invitation/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create Prisma repository implementation**

Create `packages/core/src/modules/invitation/infrastructure/prisma-invitation-repository.ts`:

```typescript
import type { PrismaClient } from '@repo/db'
import type {
  InvitationRepository,
  InvitationRecord,
} from '../domain/invitation-repository.js'

export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<InvitationRecord | null> {
    const row = await this.prisma.invitation.findUnique({ where: { id } })
    if (!row) return null
    return {
      id: row.id,
      email: row.email,
      organizationId: row.organizationId,
      role: row.role,
      status: row.status,
      expiresAt: row.expiresAt,
    }
  }

  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })
    return member !== null
  }

  async acceptAndCreateMember(
    invitationId: string,
    userId: string,
    organizationId: string,
    role: string
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.member.create({
        data: { organizationId, userId, role },
      }),
      this.prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'accepted' },
      }),
    ])
  }
}
```

- [ ] **Step 2: Create module index**

Create `packages/core/src/modules/invitation/index.ts`:

```typescript
// Domain
export {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyAcceptedError,
  AlreadyMemberError,
} from './domain/invitation-errors.js'
export type {
  InvitationRepository,
  InvitationRecord,
  AcceptInvitationResult,
} from './domain/invitation-repository.js'

// Application
export { AcceptInvitation } from './application/accept-invitation.js'
export type { AcceptInvitationInput } from './application/accept-invitation.js'

// Infrastructure
export { PrismaInvitationRepository } from './infrastructure/prisma-invitation-repository.js'
```

- [ ] **Step 3: Add exports to core index**

In `packages/core/src/index.ts`, add the invitation module re-export. Find the other module exports and add:

```typescript
export * from './modules/invitation/index.js'
```

- [ ] **Step 4: Verify build**

Run: `pnpm --filter @repo/core build`
Expected: Successful build.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/invitation/ packages/core/src/index.ts
git commit -m "feat: add invitation infrastructure layer + module exports (P2-6)"
```

---

### Task 10: Wire Up Invitation Use Case in Server (P2-6)

**Files:**

- Modify: `apps/server/src/container-registrations.ts`
- Modify: `apps/server/src/routes/v1/invitations/accept-invitation.ts`
- Modify: `apps/server/src/routes/v1/handle-domain-error.ts` (if needed)

- [ ] **Step 1: Register invitation repository in DI container**

In `apps/server/src/container-registrations.ts`:

Add to imports (at the top, in the import from `@repo/core`):

```typescript
  AcceptInvitation,
  PrismaInvitationRepository,
```

Add after the member use case registrations (around line 322):

```typescript
// Invitation use cases
const invitationRepo = new PrismaInvitationRepository(prisma)
container.register('InvitationRepository', { useValue: invitationRepo })
container.register(AcceptInvitation, {
  useFactory: () => new AcceptInvitation(invitationRepo),
})
```

- [ ] **Step 2: Simplify accept-invitation handler**

Replace the handler logic in `apps/server/src/routes/v1/invitations/accept-invitation.ts`. The auth logic (register/login, cookie forwarding, set active org) stays in the handler. The business logic (validate invitation, check membership, create member) moves to the use case.

Replace the handler function (lines 64-251) with a simplified version that:

1. Does auth (register/login) — same code as before
2. Calls `AcceptInvitation.execute({ invitationId, userId })` from the DI container
3. Sets active organization — same code as before
4. Handles domain errors via the centralized error handler

The key change: replace the manual Prisma queries (invitation validation, member check, transaction) with a single `useCase.execute()` call. Keep the auth code and cookie forwarding in the handler.

Import `AcceptInvitation` from `@repo/core` and `container` from `@repo/core`. Resolve the use case with `container.resolve(AcceptInvitation)`. Map domain errors (InvitationNotFoundError → 404, InvitationExpiredError → 400, InvitationAlreadyAcceptedError → 400, AlreadyMemberError → 409) using the existing `handleDomainError` pattern or inline error mapping.

Also add the new error codes to `apps/server/src/routes/v1/handle-domain-error.ts` if they are not already there.

- [ ] **Step 3: Verify build and tests**

Run: `pnpm build && pnpm test`
Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/container-registrations.ts apps/server/src/routes/v1/invitations/accept-invitation.ts apps/server/src/routes/v1/handle-domain-error.ts
git commit -m "refactor: use AcceptInvitation use case in handler, remove inline Prisma logic (P2-6)"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run full quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

Expected: All 4 gates pass with zero errors.

- [ ] **Step 2: Verify test count increased**

Run: `pnpm test 2>&1 | grep -E "Tests|Files"`
Expected: Test count should be 218 + 6 (endorsement: 1+2+3) + 11 (member: 6+5) + 6 (invitation) = **241+ tests**

- [ ] **Step 3: Verify all changes are committed**

```bash
git status
git log --oneline -12
```

Expected: Clean working tree, ~10 commits.
