# SCRUM-25 Dashboard Cards (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new dashboard cards (Seguro Novo, Renovação 7d expandida, Avisos, Propostas Pendentes) with chip/breakdown UI, consolidate layout to 6 cards, and wire deep-link filters on list pages.

**Architecture:** Extend existing `GET /api/v1/stats/dashboard` with new aggregations (parallelized in the existing `Promise.all`); reuse the `ComparisonStatCard` + add new card components for chips/breakdowns; extend list endpoint query schemas with new filters (`boardType`, `createdFrom/To`, `updatedAtFrom/To`, `status=open`).

**Tech Stack:** Fastify 5 + Zod + Prisma 7 (PostgreSQL 18) · Next.js 16 App Router + React Query · shadcn/ui @coss/style · Vitest + Playwright MCP.

**Spec:** [docs/superpowers/specs/2026-04-17-scrum-25-dashboard-cards-design.md](../specs/2026-04-17-scrum-25-dashboard-cards-design.md)

---

## Phase 0 — Audit existing filter state

### Task 0: Audit current list page query-param support

**Files (read-only):**

- `apps/server/src/routes/v1/policies/_schemas.ts:28` (`listPoliciesQuery`)
- `apps/server/src/routes/v1/proposals/_schemas.ts:175` (`listProposalsQuery`)
- `apps/server/src/routes/v1/claims/_schemas.ts:49` (`listClaimsQuerySchema`)
- `apps/server/src/routes/v1/assistances/_schemas.ts:42` (`listAssistancesQuerySchema`)
- `apps/web/src/app/(dashboard)/policies/page.tsx`
- `apps/web/src/app/(dashboard)/proposals/page.tsx`
- `apps/web/src/app/(dashboard)/claims/page.tsx`
- `apps/web/src/app/(dashboard)/assistances/page.tsx`

- [ ] **Step 1: Read each schema file and note which filters already exist**

For each list endpoint, document the current accepted query params. Write findings to a scratch file `audit-scrum25.md` (git-ignored) so later tasks know what already works vs what needs adding. Template:

```
# Filter audit (2026-04-17)

## /policies
Current: status, clientId, proposalId, branch, search
Needed for SCRUM-25: boardType, createdFrom, createdTo, filter=expiring-7d
Gap: boardType, createdFrom, createdTo (all missing)
      filter=expiring-7d → NOT a schema field, handled in AlertsWidget as URL convention — needs concrete wiring on list page
```

- [ ] **Step 2: Document URL behavior on each list page**

For each `page.tsx`, check how it reads `searchParams` today. Note which query params are already passed to the API hook, which are ignored.

- [ ] **Step 3: Commit audit file**

```bash
# audit-scrum25.md is scratch — do NOT commit
# just save findings in conversation context for later tasks
echo "Audit complete. Gaps documented."
```

**Why this audit first:** spec warns "não assumir". We need the exact gap list before touching code.

---

## Phase 1 — Backend: Prisma index

### Task 1: Add composite index for bucket queries

**Files:**

- Modify: `packages/db/prisma/schema.prisma` (Proposal model)
- Generated: `packages/db/prisma/migrations/<timestamp>_add_proposal_stage_updated_at_index/migration.sql`

- [ ] **Step 1: Read current Proposal model indexes**

```bash
# Read the file around the Proposal model
```

Read `packages/db/prisma/schema.prisma:309-352` to see existing `@@index` blocks.

- [ ] **Step 2: Add composite index**

Edit `packages/db/prisma/schema.prisma` inside the `model Proposal` block, after the existing `@@index` entries (around line 351):

```prisma
  @@index([organizationId, stage, updatedAt(sort: Desc)])
```

- [ ] **Step 3: Create migration**

```bash
pnpm --filter @repo/db exec prisma migrate dev --name add_proposal_stage_updated_at_index
```

Expected: new migration folder created under `packages/db/prisma/migrations/`, Prisma Client regenerated. Migration SQL should contain `CREATE INDEX` on `"Proposal"("organizationId", "stage", "updatedAt" DESC)`.

- [ ] **Step 4: Verify typecheck still passes**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add composite index on Proposal(orgId, stage, updatedAt)"
```

---

## Phase 2 — Backend: Stats response schema

### Task 2: Extend dashboardDataSchema with new fields

**Files:**

- Modify: `apps/server/src/routes/v1/stats/_schemas.ts` (around line 69)

- [ ] **Step 1: Add new schema snippets**

Edit `apps/server/src/routes/v1/stats/_schemas.ts`. After the `rankingEntrySchema` declaration (~line 67), add:

```ts
const warningsSchema = z.object({
  total: z.number(),
  claimsOpen: z.number(),
  assistancesOpen: z.number(),
})

const proposalsPendingBucketsSchema = z.object({
  total: z.number(),
  inDay: z.number(),
  warning: z.number(),
  critical: z.number(),
})
```

- [ ] **Step 2: Extend dashboardDataSchema**

In the same file, replace the `dashboardDataSchema` declaration (~line 69) to include the new fields at the end, before the closing `})`:

```ts
const dashboardDataSchema = z.object({
  proposalsByStage: z.array(proposalByStageSchema).readonly(),
  activePolicies: z.number(),
  expiringPolicies: z.number(),
  renewalsNext7Days: z.number(),
  claimsByPriority: z.array(claimByPrioritySchema).readonly(),
  commissionsThisMonth: z.array(commissionByStatusSchema).readonly(),
  conversionRate: conversionRateSchema,
  monthlyTrends: z.array(monthlyTrendSchema).readonly(),
  comparison: z.object({
    proposals: metricComparisonSchema,
    policies: metricComparisonSchema,
    claims: metricComparisonSchema,
    commissionsPending: metricComparisonSchema,
  }),
  totalPremium: metricComparisonSchema,
  averageTicket: metricComparisonSchema,
  commissionsReceivable: z.number(),
  ranking: z.array(rankingEntrySchema).readonly(),
  // --- SCRUM-25 additions ---
  newInsurance: metricComparisonSchema,
  renewal7dPremiumCents: z.number(),
  warnings: warningsSchema,
  proposalsPending: proposalsPendingBucketsSchema,
})
```

- [ ] **Step 3: Run typecheck — it will fail in `stats-helpers.ts` (expected)**

```bash
pnpm --filter @app/server typecheck
```

Expected: errors pointing to `DashboardData` interface missing new fields. This is the contract — we'll wire it up next.

- [ ] **Step 4: Do NOT commit yet** — test suite for helpers must be green first. Proceed to Task 3.

---

## Phase 3 — Backend: new helper functions (TDD)

### Task 3: fetchNewInsuranceStats

**Files:**

- Test: `apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts` (new file — or extend if exists)
- Modify: `apps/server/src/routes/v1/stats/stats-helpers.ts`

- [ ] **Step 1: Write the failing test**

Create or extend `apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  calculateChangePercent,
  fetchNewInsuranceStats,
} from '../stats-helpers.js'

describe('fetchNewInsuranceStats', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns current, previous and changePercent for new insurance policies', async () => {
    const mockPrisma = {
      policy: {
        count: vi.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(10),
      },
    } as unknown as Parameters<typeof fetchNewInsuranceStats>[2]

    const ranges = {
      currentFrom: new Date('2026-04-01'),
      previousFrom: new Date('2026-03-01'),
      previousTo: new Date('2026-04-01'),
      now: new Date('2026-04-17'),
      thirtyDaysFromNow: new Date(),
      sevenDaysFromNow: new Date(),
    }

    const result = await fetchNewInsuranceStats('org-1', ranges, mockPrisma)

    expect(result).toEqual({
      current: 12,
      previous: 10,
      changePercent: 20,
    })
    expect(mockPrisma.policy.count).toHaveBeenCalledTimes(2)
  })

  it('handles zero previous period by reporting 100% when current > 0', async () => {
    const mockPrisma = {
      policy: {
        count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(0),
      },
    } as unknown as Parameters<typeof fetchNewInsuranceStats>[2]

    const result = await fetchNewInsuranceStats(
      'org-1',
      {
        currentFrom: new Date('2026-04-01'),
        previousFrom: new Date('2026-03-01'),
        previousTo: new Date('2026-04-01'),
        now: new Date('2026-04-17'),
        thirtyDaysFromNow: new Date(),
        sevenDaysFromNow: new Date(),
      },
      mockPrisma
    )

    expect(result.changePercent).toBe(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

Expected: FAIL with "fetchNewInsuranceStats is not exported from '../stats-helpers.js'".

- [ ] **Step 3: Implement fetchNewInsuranceStats**

Add to `apps/server/src/routes/v1/stats/stats-helpers.ts`, after `fetchComparisonData` (~line 296):

```ts
export async function fetchNewInsuranceStats(
  orgId: string,
  ranges: DateRange,
  db: DbClient
): Promise<MetricComparison> {
  const [current, previous] = await Promise.all([
    db.policy.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: { gte: ranges.currentFrom, lte: ranges.now },
        proposal: { boardType: 'NEW_INSURANCE' },
      },
    }),
    db.policy.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: { gte: ranges.previousFrom, lt: ranges.previousTo },
        proposal: { boardType: 'NEW_INSURANCE' },
      },
    }),
  ])

  return {
    current,
    previous,
    changePercent: calculateChangePercent(current, previous),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/stats/stats-helpers.ts apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts
git commit -m "feat(server): add fetchNewInsuranceStats helper (SCRUM-25)"
```

---

### Task 4: fetchRenewal7dPremium

**Files:**

- Test: `apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts` (extend)
- Modify: `apps/server/src/routes/v1/stats/stats-helpers.ts`

- [ ] **Step 1: Write the failing test**

Append to `stats-helpers.spec.ts`:

```ts
import { fetchRenewal7dPremium } from '../stats-helpers.js'

describe('fetchRenewal7dPremium', () => {
  it('sums premiumValueInCents of active policies expiring in next 7d', async () => {
    const mockPrisma = {
      policy: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { premiumValueInCents: 2_345_000 },
        }),
      },
    } as unknown as Parameters<typeof fetchRenewal7dPremium>[2]

    const ranges = {
      currentFrom: new Date('2026-04-01'),
      previousFrom: new Date('2026-03-01'),
      previousTo: new Date('2026-04-01'),
      now: new Date('2026-04-17'),
      thirtyDaysFromNow: new Date('2026-05-17'),
      sevenDaysFromNow: new Date('2026-04-24'),
    }

    const result = await fetchRenewal7dPremium('org-1', ranges, mockPrisma)
    expect(result).toBe(2_345_000)

    const call = vi.mocked(mockPrisma.policy.aggregate).mock.calls[0]![0]
    expect(call.where).toMatchObject({
      organizationId: 'org-1',
      deletedAt: null,
      status: 'ACTIVE',
    })
    expect(call.where.endDate).toEqual({
      lte: ranges.sevenDaysFromNow,
      gte: ranges.now,
    })
    expect(call._sum).toEqual({ premiumValueInCents: true })
  })

  it('returns 0 when no matching policies', async () => {
    const mockPrisma = {
      policy: {
        aggregate: vi
          .fn()
          .mockResolvedValue({ _sum: { premiumValueInCents: null } }),
      },
    } as unknown as Parameters<typeof fetchRenewal7dPremium>[2]

    const ranges = {
      currentFrom: new Date(),
      previousFrom: new Date(),
      previousTo: new Date(),
      now: new Date(),
      thirtyDaysFromNow: new Date(),
      sevenDaysFromNow: new Date(),
    }

    expect(await fetchRenewal7dPremium('org-1', ranges, mockPrisma)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

Expected: FAIL ("fetchRenewal7dPremium is not exported").

- [ ] **Step 3: Implement**

Add to `stats-helpers.ts`:

```ts
export async function fetchRenewal7dPremium(
  orgId: string,
  ranges: DateRange,
  db: DbClient
): Promise<number> {
  const { now, sevenDaysFromNow } = ranges
  const result = await db.policy.aggregate({
    where: {
      organizationId: orgId,
      status: 'ACTIVE',
      deletedAt: null,
      endDate: { lte: sevenDaysFromNow, gte: now },
    },
    _sum: { premiumValueInCents: true },
  })
  return result._sum.premiumValueInCents ?? 0
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/stats/stats-helpers.ts apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts
git commit -m "feat(server): add fetchRenewal7dPremium helper (SCRUM-25)"
```

---

### Task 5: fetchWarnings

**Files:**

- Test: `apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts` (extend)
- Modify: `apps/server/src/routes/v1/stats/stats-helpers.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
import { fetchWarnings } from '../stats-helpers.js'

describe('fetchWarnings', () => {
  it('returns claims open + assistances open + total', async () => {
    const mockPrisma = {
      claim: { count: vi.fn().mockResolvedValue(5) },
      assistance: { count: vi.fn().mockResolvedValue(3) },
    } as unknown as Parameters<typeof fetchWarnings>[1]

    const result = await fetchWarnings('org-1', mockPrisma)

    expect(result).toEqual({ total: 8, claimsOpen: 5, assistancesOpen: 3 })

    const claimCall = vi.mocked(mockPrisma.claim.count).mock.calls[0]![0]
    expect(claimCall.where.status).toEqual({ notIn: ['COMPLETED', 'REJECTED'] })

    const assistCall = vi.mocked(mockPrisma.assistance.count).mock.calls[0]![0]
    expect(assistCall.where.status).toEqual({ not: 'COMPLETED' })
  })

  it('returns zeroes when both queries return 0', async () => {
    const mockPrisma = {
      claim: { count: vi.fn().mockResolvedValue(0) },
      assistance: { count: vi.fn().mockResolvedValue(0) },
    } as unknown as Parameters<typeof fetchWarnings>[1]

    expect(await fetchWarnings('org-1', mockPrisma)).toEqual({
      total: 0,
      claimsOpen: 0,
      assistancesOpen: 0,
    })
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

- [ ] **Step 3: Implement**

Add to `stats-helpers.ts`:

```ts
interface WarningsStats {
  readonly total: number
  readonly claimsOpen: number
  readonly assistancesOpen: number
}

export async function fetchWarnings(
  orgId: string,
  db: DbClient
): Promise<WarningsStats> {
  const [claimsOpen, assistancesOpen] = await Promise.all([
    db.claim.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'REJECTED'] },
      },
    }),
    db.assistance.count({
      where: {
        organizationId: orgId,
        status: { not: 'COMPLETED' },
      },
    }),
  ])
  return { total: claimsOpen + assistancesOpen, claimsOpen, assistancesOpen }
}
```

Note: `Assistance` model has no `deletedAt` field (verified in schema.prisma line 499-525), so don't filter by it.

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/stats/stats-helpers.ts apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts
git commit -m "feat(server): add fetchWarnings helper (SCRUM-25)"
```

---

### Task 6: fetchProposalsPendingByBucket

**Files:**

- Test: `apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts` (extend)
- Modify: `apps/server/src/routes/v1/stats/stats-helpers.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
import { fetchProposalsPendingByBucket } from '../stats-helpers.js'

describe('fetchProposalsPendingByBucket', () => {
  it('returns 3 bucket counts and total', async () => {
    const mockPrisma = {
      proposal: {
        count: vi
          .fn()
          .mockResolvedValueOnce(12) // inDay (0-3d)
          .mockResolvedValueOnce(5) // warning (3-7d)
          .mockResolvedValueOnce(2), // critical (7d+)
      },
    } as unknown as Parameters<typeof fetchProposalsPendingByBucket>[1]

    const result = await fetchProposalsPendingByBucket('org-1', mockPrisma)

    expect(result).toEqual({ total: 19, inDay: 12, warning: 5, critical: 2 })
    expect(mockPrisma.proposal.count).toHaveBeenCalledTimes(3)

    const inDayCall = vi.mocked(mockPrisma.proposal.count).mock.calls[0]![0]
    expect(inDayCall.where.stage).toEqual({
      in: ['CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT'],
    })
    expect(inDayCall.where.deletedAt).toBe(null)
    expect(inDayCall.where.updatedAt).toHaveProperty('gte')

    const warningCall = vi.mocked(mockPrisma.proposal.count).mock.calls[1]![0]
    expect(warningCall.where.updatedAt).toHaveProperty('gte')
    expect(warningCall.where.updatedAt).toHaveProperty('lt')

    const criticalCall = vi.mocked(mockPrisma.proposal.count).mock.calls[2]![0]
    expect(criticalCall.where.updatedAt).toHaveProperty('lt')
    expect(criticalCall.where.updatedAt).not.toHaveProperty('gte')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

- [ ] **Step 3: Implement**

Add to `stats-helpers.ts`:

```ts
interface ProposalsPendingBuckets {
  readonly total: number
  readonly inDay: number
  readonly warning: number
  readonly critical: number
}

const PENDING_STAGES: readonly ProposalStage[] = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
]

export async function fetchProposalsPendingByBucket(
  orgId: string,
  db: DbClient,
  now: Date = new Date()
): Promise<ProposalsPendingBuckets> {
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const baseWhere = {
    organizationId: orgId,
    deletedAt: null,
    stage: { in: PENDING_STAGES },
  } as const

  const [inDay, warning, critical] = await Promise.all([
    db.proposal.count({
      where: { ...baseWhere, updatedAt: { gte: threeDaysAgo } },
    }),
    db.proposal.count({
      where: {
        ...baseWhere,
        updatedAt: { gte: sevenDaysAgo, lt: threeDaysAgo },
      },
    }),
    db.proposal.count({
      where: { ...baseWhere, updatedAt: { lt: sevenDaysAgo } },
    }),
  ])

  return { total: inDay + warning + critical, inDay, warning, critical }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/stats-helpers.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/stats/stats-helpers.ts apps/server/src/routes/v1/stats/__tests__/stats-helpers.spec.ts
git commit -m "feat(server): add fetchProposalsPendingByBucket helper (SCRUM-25)"
```

---

## Phase 4 — Backend: wire into buildDashboardData

### Task 7: Integrate helpers into buildDashboardData + update DashboardData interface

**Files:**

- Modify: `apps/server/src/routes/v1/stats/stats-helpers.ts` (DashboardData interface + buildDashboardData)

- [ ] **Step 1: Extend `DashboardData` interface**

In `stats-helpers.ts`, replace the existing `DashboardData` interface (~line 72) with:

```ts
export interface DashboardData {
  readonly proposalsByStage: readonly ProposalByStage[]
  readonly activePolicies: number
  readonly expiringPolicies: number
  readonly renewalsNext7Days: number
  readonly claimsByPriority: readonly ClaimByPriority[]
  readonly commissionsThisMonth: readonly CommissionByStatus[]
  readonly conversionRate: ConversionRate
  readonly monthlyTrends: readonly MonthlyTrendRow[]
  readonly comparison: {
    readonly proposals: MetricComparison
    readonly policies: MetricComparison
    readonly claims: MetricComparison
    readonly commissionsPending: MetricComparison
  }
  readonly totalPremium: MetricComparison
  readonly averageTicket: MetricComparison
  readonly commissionsReceivable: number
  readonly ranking: readonly RankingEntry[]
  // --- SCRUM-25 ---
  readonly newInsurance: MetricComparison
  readonly renewal7dPremiumCents: number
  readonly warnings: WarningsStats
  readonly proposalsPending: ProposalsPendingBuckets
}
```

- [ ] **Step 2: Extend buildDashboardData to call the 4 new helpers in Promise.all**

Replace the `buildDashboardData` function (end of file) with:

```ts
export async function buildDashboardData(
  orgId: string,
  preset: DashboardPreset,
  db: DbClient = prisma
): Promise<DashboardData> {
  const ranges = buildDateRanges(preset)

  const [
    chartResults,
    comparisonData,
    ranking,
    newInsurance,
    renewal7dPremiumCents,
    warnings,
    proposalsPending,
  ] = await Promise.all([
    fetchChartData(orgId, ranges, db),
    fetchComparisonData(orgId, ranges, db),
    fetchRanking(orgId, ranges.currentFrom, db),
    fetchNewInsuranceStats(orgId, ranges, db),
    fetchRenewal7dPremium(orgId, ranges, db),
    fetchWarnings(orgId, db),
    fetchProposalsPendingByBucket(orgId, db, ranges.now),
  ])

  const [
    proposalsByStage,
    activePolicies,
    expiringPolicies,
    claimsByPriority,
    commissionsThisMonth,
    conversionRate,
    monthlyTrends,
    renewalsNext7Days,
  ] = chartResults

  return {
    proposalsByStage,
    activePolicies,
    expiringPolicies,
    renewalsNext7Days,
    claimsByPriority,
    commissionsThisMonth,
    conversionRate,
    monthlyTrends,
    ranking,
    newInsurance,
    renewal7dPremiumCents,
    warnings,
    proposalsPending,
    ...buildComparisonMetrics(comparisonData),
  }
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter @app/server typecheck
```

Expected: 0 errors. The response schema (`_schemas.ts`) now aligns with `DashboardData`.

- [ ] **Step 4: Run server tests (includes existing dashboard tests)**

```bash
pnpm --filter @app/server test
```

Expected: all pass, including `get-dashboard-stats.spec.ts` (may need mock extension — handle in next step if it fails).

- [ ] **Step 5: If get-dashboard-stats.spec.ts fails (missing fields in mock), update mock**

Read `apps/server/src/routes/v1/stats/__tests__/get-dashboard-stats.spec.ts` and ensure test expectations include the new fields. If the spec asserts on response shape, extend the expected data with default values:

```ts
// In each mocked `buildDashboardData` response, add:
newInsurance: { current: 0, previous: 0, changePercent: 0 },
renewal7dPremiumCents: 0,
warnings: { total: 0, claimsOpen: 0, assistancesOpen: 0 },
proposalsPending: { total: 0, inDay: 0, warning: 0, critical: 0 },
```

Re-run tests until green.

- [ ] **Step 6: Update export-dashboard-pdf.spec.ts similarly if it asserts response shape**

Same mock extension if failing.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes/v1/stats/
git commit -m "feat(server): extend dashboard endpoint with SCRUM-25 fields"
```

---

### Task 8: Integration test — dashboard aggregates with real DB

**Files:**

- Create: `apps/server/src/routes/v1/stats/__tests__/dashboard-stats.int.spec.ts`

- [ ] **Step 1: Inspect existing integration test patterns**

Read `apps/server/src/routes/v1/policies/__tests__/` for existing integration test patterns (seeds, teardown).

- [ ] **Step 2: Write integration test**

Create `apps/server/src/routes/v1/stats/__tests__/dashboard-stats.int.spec.ts`:

```ts
import { prismaAdmin as prisma } from '@repo/db'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDashboardData } from '../stats-helpers.js'

// Seed utilities — follow patterns in other .int.spec.ts in this repo
describe('buildDashboardData (integration)', () => {
  const orgAId = 'test-org-a-scrum25'
  const orgBId = 'test-org-b-scrum25'

  beforeAll(async () => {
    // seed 2 orgs + users + clients. Replicate pattern from any existing .int.spec.ts
    // (If no helper exists, use prismaAdmin.organization.upsert + member upsert)
  })

  afterAll(async () => {
    // cleanup org A and B cascades
  })

  beforeEach(async () => {
    await prisma.proposal.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    })
    await prisma.policy.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    })
    await prisma.claim.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    })
    await prisma.assistance.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    })
  })

  it('isolates stats per tenant', async () => {
    // Seed 3 NEW_INSURANCE policies in orgA, 1 in orgB
    // Assert: orgA.newInsurance.current === 3, orgB.newInsurance.current === 1
    // Exact seed code depends on your schema — use prismaAdmin.proposal.create + policy.create
    // This is a placeholder showing the shape:
    const dataA = await buildDashboardData(orgAId, '30d')
    const dataB = await buildDashboardData(orgBId, '30d')
    expect(dataA.newInsurance.current).toBeGreaterThanOrEqual(0)
    expect(dataB.newInsurance.current).toBeGreaterThanOrEqual(0)
  })

  it('buckets proposals correctly by updatedAt', async () => {
    // Seed 3 proposals in orgA with updatedAt: 1d ago, 5d ago, 10d ago
    // All in stage QUOTE
    // Assert: proposalsPending.inDay === 1, warning === 1, critical === 1, total === 3
    const data = await buildDashboardData(orgAId, '30d')
    expect(data.proposalsPending.total).toBe(
      data.proposalsPending.inDay +
        data.proposalsPending.warning +
        data.proposalsPending.critical
    )
  })

  it('counts only open claims and assistances in warnings', async () => {
    // Seed claims: 1 REGISTERED, 1 COMPLETED, 1 REJECTED
    // Seed assistances: 1 DISPATCHED, 1 COMPLETED
    // Assert: warnings.claimsOpen === 1 (only REGISTERED), assistancesOpen === 1 (only DISPATCHED)
    const data = await buildDashboardData(orgAId, '30d')
    expect(data.warnings.total).toBe(
      data.warnings.claimsOpen + data.warnings.assistancesOpen
    )
  })
})
```

**Note for implementer:** The placeholders above show the test shape. Fill in actual seed data using `prismaAdmin.proposal.create`, `prismaAdmin.policy.create` (with required fields from schema). Look at any existing `.int.spec.ts` in the repo for a working seed pattern. **Do not** commit stubbed assertions — replace with concrete expectations backed by seed data.

- [ ] **Step 3: Run the integration test against the dev DB**

```bash
docker compose up -d  # ensure PostgreSQL is running
pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/dashboard-stats.int.spec.ts
```

Expected: all tests pass after you fill in the seed code.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/stats/__tests__/dashboard-stats.int.spec.ts
git commit -m "test(server): integration tests for SCRUM-25 dashboard aggregates"
```

---

## Phase 5 — Backend: list endpoint filters

### Task 9: Extend Proposal list — stages CSV + updatedAt range

**Files:**

- Modify: `apps/server/src/routes/v1/proposals/_schemas.ts` (`listProposalsQuery`)
- Modify: `apps/server/src/routes/v1/proposals/list-proposals.ts`
- Modify: `packages/core/src/modules/proposal/domain/proposal-repository.ts` (`ProposalFilters`)
- Modify: `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts` (`findMany`)
- Test: `packages/core/src/modules/proposal/application/list-proposals.spec.ts` (extend existing)

- [ ] **Step 1: Write a failing test for stages + updatedAt range**

Edit `packages/core/src/modules/proposal/application/list-proposals.spec.ts` — add:

```ts
it('filters by multiple stages and updatedAt range', async () => {
  const mockRepo = {
    findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  } as unknown as ProposalRepository

  const useCase = new ListProposals(mockRepo)
  const updatedAtFrom = new Date('2026-04-10')
  const updatedAtTo = new Date('2026-04-17')

  await useCase.execute(
    {
      organizationId: 'org-1',
      stages: ['QUOTE', 'PROTOCOL'],
      updatedAtFrom,
      updatedAtTo,
    },
    { limit: 20 }
  )

  expect(mockRepo.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      stages: ['QUOTE', 'PROTOCOL'],
      updatedAtFrom,
      updatedAtTo,
    }),
    expect.anything()
  )
})
```

- [ ] **Step 2: Extend ProposalFilters interface**

Edit `packages/core/src/modules/proposal/domain/proposal-repository.ts`:

```ts
export interface ProposalFilters {
  organizationId: string
  stage?: Stage
  stages?: readonly Stage[]
  clientId?: string
  salespersonId?: string
  boardType?: BoardType
  insurerId?: string
  sourcePolicyId?: string
  createdFrom?: Date
  createdTo?: Date
  updatedAtFrom?: Date
  updatedAtTo?: Date
  search?: string
}
```

Keep both `stage` (single) and `stages` (array) for back-compat.

- [ ] **Step 3: Extend PrismaProposalRepository.findMany**

In `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts`, modify the `where` construction (~line 89):

```ts
const createdAt: Prisma.DateTimeFilter = {}
if (filters.createdFrom) createdAt.gte = filters.createdFrom
if (filters.createdTo) createdAt.lte = filters.createdTo

const updatedAt: Prisma.DateTimeFilter = {}
if (filters.updatedAtFrom) updatedAt.gte = filters.updatedAtFrom
if (filters.updatedAtTo) updatedAt.lte = filters.updatedAtTo

const stageFilter: Prisma.EnumProposalStageFilter | undefined =
  filters.stages && filters.stages.length > 0
    ? { in: [...filters.stages] }
    : filters.stage
      ? { equals: filters.stage }
      : undefined

const where: Prisma.ProposalWhereInput = {
  organizationId: filters.organizationId,
  deletedAt: null,
  ...(stageFilter && { stage: stageFilter }),
  ...(filters.clientId && { clientId: filters.clientId }),
  ...(filters.salespersonId && { salespersonId: filters.salespersonId }),
  ...(filters.boardType && { boardType: filters.boardType }),
  ...(filters.insurerId && { insurerId: filters.insurerId }),
  ...(filters.sourcePolicyId && { sourcePolicyId: filters.sourcePolicyId }),
  ...(Object.keys(createdAt).length > 0 && { createdAt }),
  ...(Object.keys(updatedAt).length > 0 && { updatedAt }),
  ...(filters.search && {
    OR: [
      { client: { name: { contains: filters.search, mode: 'insensitive' } } },
      {
        sourcePolicy: {
          policyNumber: { contains: filters.search, mode: 'insensitive' },
        },
      },
    ],
  }),
}
```

- [ ] **Step 4: Extend Zod schema**

In `apps/server/src/routes/v1/proposals/_schemas.ts`, extend `listProposalsQuery` (~line 175):

```ts
export const listProposalsQuery = paginationQuery().extend({
  stage: proposalStageEnum.optional(),
  // CSV form accepted from URL (e.g. ?stages=QUOTE,PROTOCOL)
  stages: z
    .string()
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(proposalStageEnum))
    .optional(),
  clientId: z.string().optional(),
  salespersonId: z.string().optional(),
  insurerId: z.string().optional(),
  sourcePolicyId: z.string().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  updatedAtFrom: z.coerce.date().optional(),
  updatedAtTo: z.coerce.date().optional(),
  boardType: boardTypeEnum.optional(),
  search: z.string().optional(),
  sortBy: proposalSortByEnum.optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})
```

- [ ] **Step 5: Route already spreads filters — no changes to list-proposals.ts needed**

Verify `apps/server/src/routes/v1/proposals/list-proposals.ts` spreads all query fields into `useCase.execute` (it does via `...filters`). If not, fix.

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/list-proposals.spec.ts
pnpm --filter @app/server typecheck
pnpm --filter @app/server test
```

All pass expected.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/modules/proposal/ apps/server/src/routes/v1/proposals/_schemas.ts apps/server/src/routes/v1/proposals/list-proposals.ts
git commit -m "feat(proposals): filter by stages CSV and updatedAt range"
```

---

### Task 10: Extend Policy list — boardType + createdFrom/To

**Files:**

- Modify: `apps/server/src/routes/v1/policies/_schemas.ts`
- Modify: `packages/core/src/modules/policy/domain/policy-repository.ts` (check current interface first)
- Modify: `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts`
- Test: `packages/core/src/modules/policy/application/list-policies.spec.ts` (extend or create)

- [ ] **Step 1: Read current policy repository and use case**

```bash
# Read these files first to understand the shape
cat packages/core/src/modules/policy/domain/policy-repository.ts
cat packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts
cat packages/core/src/modules/policy/application/list-policies.ts
```

- [ ] **Step 2: Write failing test**

Create or extend `packages/core/src/modules/policy/application/list-policies.spec.ts`:

```ts
it('filters by boardType via proposal relation', async () => {
  const mockRepo = {
    findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  } as unknown as PolicyRepository

  const useCase = new ListPolicies(mockRepo)

  await useCase.execute(
    { organizationId: 'org-1', boardType: 'NEW_INSURANCE' },
    { limit: 20 }
  )

  expect(mockRepo.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ boardType: 'NEW_INSURANCE' }),
    expect.anything()
  )
})

it('filters by createdFrom and createdTo', async () => {
  const mockRepo = {
    findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  } as unknown as PolicyRepository

  const useCase = new ListPolicies(mockRepo)
  const from = new Date('2026-04-01')
  const to = new Date('2026-04-17')

  await useCase.execute(
    { organizationId: 'org-1', createdFrom: from, createdTo: to },
    { limit: 20 }
  )

  expect(mockRepo.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ createdFrom: from, createdTo: to }),
    expect.anything()
  )
})
```

- [ ] **Step 3: Extend PolicyFilters interface**

In `packages/core/src/modules/policy/domain/policy-repository.ts`, add to `PolicyFilters`:

```ts
boardType?: BoardType
createdFrom?: Date
createdTo?: Date
```

Import `BoardType` from `'../../proposal/domain/proposal.js'` if not already.

- [ ] **Step 4: Extend PrismaPolicyRepository.findMany**

In `prisma-policy-repository.ts`, add the new filter handling in the `where` construction:

```ts
const createdAt: Prisma.DateTimeFilter = {}
if (filters.createdFrom) createdAt.gte = filters.createdFrom
if (filters.createdTo) createdAt.lte = filters.createdTo

const where: Prisma.PolicyWhereInput = {
  organizationId: filters.organizationId,
  deletedAt: null,
  // ... existing filters ...
  ...(filters.boardType && {
    proposal: { boardType: filters.boardType },
  }),
  ...(Object.keys(createdAt).length > 0 && { createdAt }),
}
```

- [ ] **Step 5: Extend Zod schema**

In `apps/server/src/routes/v1/policies/_schemas.ts:28`, extend `listPoliciesQuery`:

```ts
export const listPoliciesQuery = paginationQuery().extend({
  status: policyStatusEnum.optional(),
  clientId: z.string().optional(),
  proposalId: z.string().optional(),
  branch: branchEnum.optional(),
  boardType: z.enum(['NEW_INSURANCE', 'RENEWAL', 'ENDORSEMENT']).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  search: z.string().optional(),
})
```

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @repo/core test
pnpm --filter @app/server typecheck
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/modules/policy/ apps/server/src/routes/v1/policies/_schemas.ts
git commit -m "feat(policies): filter list by boardType and createdAt range"
```

---

### Task 11: Extend Claim list — status=open shortcut

**Files:**

- Modify: `apps/server/src/routes/v1/claims/_schemas.ts`
- Modify: `apps/server/src/routes/v1/claims/list-claims.ts` (handle shortcut mapping)
- Modify: `packages/core/src/modules/claim/domain/claim-repository.ts` + use case if needed

- [ ] **Step 1: Read ListClaims use case to understand filter shape**

```bash
cat packages/core/src/modules/claim/domain/claim-repository.ts
cat packages/core/src/modules/claim/application/list-claims.ts
cat packages/core/src/modules/claim/infrastructure/prisma-claim-repository.ts
```

- [ ] **Step 2: Extend ClaimFilters with statusGroup**

In `packages/core/src/modules/claim/domain/claim-repository.ts`, add `statusGroup?: 'open' | 'closed'` to filters.

- [ ] **Step 3: Extend PrismaClaimRepository.findMany**

Add to `where`:

```ts
...(filters.statusGroup === 'open' && {
  status: { notIn: ['COMPLETED', 'REJECTED'] },
}),
...(filters.statusGroup === 'closed' && {
  status: { in: ['COMPLETED', 'REJECTED'] },
}),
```

`statusGroup` takes precedence over `status` if both passed — pick one semantic.

- [ ] **Step 4: Write test asserting status=open shortcut**

Add to `packages/core/src/modules/claim/application/list-claims.spec.ts` (or create):

```ts
it('maps status=open to notIn COMPLETED REJECTED via statusGroup', async () => {
  const mockRepo = {
    findMany: vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, nextCursor: null }),
  } as unknown as ClaimRepository

  const useCase = new ListClaims(mockRepo)
  await useCase.execute(
    { organizationId: 'org-1', statusGroup: 'open' },
    { limit: 20 }
  )

  expect(mockRepo.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ statusGroup: 'open' }),
    expect.anything()
  )
})
```

- [ ] **Step 5: Extend Zod schema**

In `apps/server/src/routes/v1/claims/_schemas.ts:49`, extend `listClaimsQuerySchema`:

```ts
export const listClaimsQuerySchema = paginationQuery().extend({
  status: z.enum(CLAIM_STATUS_VALUES).optional(),
  statusGroup: z.enum(['open', 'closed']).optional(),
  priority: z.enum(CLAIM_PRIORITY_VALUES).optional(),
  policyId: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['claimNumber', 'status', 'priority', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})
```

**URL shortcut note:** `?status=open` will NOT work now because `'open'` isn't a valid `CLAIM_STATUS_VALUES` member. To support `?status=open`, use `statusGroup=open` instead. The frontend card will link to `/claims?statusGroup=open`.

**Update spec usage:** Avisos card link → `/claims?statusGroup=open` (not `?status=open`).

- [ ] **Step 6: Run tests**

```bash
pnpm --filter @repo/core test
pnpm --filter @app/server typecheck
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/modules/claim/ apps/server/src/routes/v1/claims/
git commit -m "feat(claims): add statusGroup=open|closed filter shortcut"
```

---

### Task 12: Extend Assistance list — statusGroup=open

**Files:**

- Modify: `apps/server/src/routes/v1/assistances/_schemas.ts`
- Modify: `packages/core/src/modules/assistance/domain/assistance-repository.ts`
- Modify: `packages/core/src/modules/assistance/infrastructure/prisma-assistance-repository.ts`

- [ ] **Step 1: Read assistance use case and repo**

```bash
cat packages/core/src/modules/assistance/domain/assistance-repository.ts
cat packages/core/src/modules/assistance/infrastructure/prisma-assistance-repository.ts
```

- [ ] **Step 2: Extend AssistanceFilters + findMany**

Add `statusGroup?: 'open' | 'closed'`. In repo `where`:

```ts
...(filters.statusGroup === 'open' && { status: { not: 'COMPLETED' } }),
...(filters.statusGroup === 'closed' && { status: 'COMPLETED' }),
```

- [ ] **Step 3: Write test in list-assistances.spec.ts**

Same pattern as Claim test above.

- [ ] **Step 4: Extend Zod schema**

In `apps/server/src/routes/v1/assistances/_schemas.ts:42`:

```ts
export const listAssistancesQuerySchema = z.object({
  status: z.enum(ASSISTANCE_STATUS_VALUES).optional(),
  statusGroup: z.enum(['open', 'closed']).optional(),
  policyId: z.string().optional(),
  clientId: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['type', 'status', 'requestedAt', 'createdAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})
```

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @repo/core test
pnpm --filter @app/server typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/assistance/ apps/server/src/routes/v1/assistances/
git commit -m "feat(assistances): add statusGroup=open|closed filter shortcut"
```

---

## Phase 6 — Frontend: regenerate types + new cards

### Task 13: Regenerate Orval types from extended OpenAPI spec

**Files:**

- Auto-generated: `apps/web/src/api/endpoints/stats/*`, `apps/web/src/api/endpoints/proposals/*`, `apps/web/src/api/endpoints/policies/*`, `apps/web/src/api/endpoints/claims/*`, `apps/web/src/api/endpoints/assistances/*`, `apps/web/src/api/model/*`

- [ ] **Step 1: Start server on :3001**

```bash
pnpm --filter @app/server dev &
# wait a couple seconds for startup
```

- [ ] **Step 2: Regenerate**

```bash
pnpm --filter @app/web generate:api
```

Expected: Orval output showing regenerated types.

- [ ] **Step 3: Stop dev server**

```bash
# find and kill the bg server process
pkill -f "pnpm --filter @app/server dev" || true
```

- [ ] **Step 4: Run typecheck — frontend may have new errors to address**

```bash
pnpm --filter @app/web typecheck
```

Fix any compile errors introduced by new schema fields. Most likely zero, since new fields are additions.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/
git commit -m "chore(web): regenerate API types for SCRUM-25 fields"
```

---

### Task 14: Create NewInsuranceCard component

**Files:**

- Create: `apps/web/src/features/dashboard/components/cards/new-insurance-card.tsx`
- Create: `apps/web/src/features/dashboard/components/cards/new-insurance-card.spec.tsx`

- [ ] **Step 1: Write failing test**

Create `apps/web/src/features/dashboard/components/cards/new-insurance-card.spec.tsx`:

```tsx
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NewInsuranceCard } from './new-insurance-card'

afterEach(cleanup)

describe('NewInsuranceCard', () => {
  it('renders loading skeleton when isLoading', () => {
    render(<NewInsuranceCard data={undefined} isLoading preset="30d" />)
    expect(screen.getByTestId('new-insurance-card-loading')).toBeInTheDocument()
  })

  it('renders count and comparison badge', () => {
    render(
      <NewInsuranceCard
        data={{ current: 12, previous: 10, changePercent: 20 }}
        isLoading={false}
        preset="30d"
      />
    )
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(/\+20%/)).toBeInTheDocument()
  })

  it('has a link to filtered policies page with boardType=NEW_INSURANCE', () => {
    render(
      <NewInsuranceCard
        data={{ current: 12, previous: 10, changePercent: 20 }}
        isLoading={false}
        preset="30d"
      />
    )
    const link = screen.getByRole('link', { name: /seguros novos/i })
    expect(link.getAttribute('href')).toContain('boardType=NEW_INSURANCE')
    expect(link.getAttribute('href')).toContain('createdFrom=')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @app/web exec vitest run src/features/dashboard/components/cards/new-insurance-card.spec.tsx
```

- [ ] **Step 3: Implement NewInsuranceCard**

Create `apps/web/src/features/dashboard/components/cards/new-insurance-card.tsx`:

```tsx
'use client'

import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { DashboardPreset } from '../../lib/constants'

interface ComparisonMetric {
  readonly current: number
  readonly previous: number
  readonly changePercent: number
}

interface NewInsuranceCardProps {
  readonly data: ComparisonMetric | undefined
  readonly isLoading: boolean
  readonly preset: DashboardPreset
}

const PRESET_TO_DAYS: Record<DashboardPreset, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 180,
}

function buildHref(preset: DashboardPreset): string {
  const days = PRESET_TO_DAYS[preset]
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams({
    boardType: 'NEW_INSURANCE',
    createdFrom: from,
  })
  return `/policies?${params.toString()}`
}

export function NewInsuranceCard({
  data,
  isLoading,
  preset,
}: NewInsuranceCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="new-insurance-card-loading">
        <CardPanel className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        </CardPanel>
      </Card>
    )
  }

  const current = data?.current ?? 0
  const hasHistory = data && data.previous > 0
  const isPositive = (data?.changePercent ?? 0) >= 0

  return (
    <Card>
      <Link
        href={buildHref(preset)}
        className="focus-visible:outline-primary block rounded-xl focus-visible:outline-2"
        aria-label={`${current} seguros novos, ver lista`}
      >
        <CardPanel className="flex items-center gap-4">
          <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-sm">
              Seguro Novo
            </p>
            <p className="truncate text-2xl font-semibold tracking-tight">
              {current}
            </p>
            {hasHistory ? (
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="size-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="size-3 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    isPositive ? 'text-emerald-500' : 'text-red-500'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {data!.changePercent}%
                </span>
                <span className="text-muted-foreground text-xs">
                  vs anterior
                </span>
              </div>
            ) : null}
          </div>
        </CardPanel>
      </Link>
    </Card>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm --filter @app/web exec vitest run src/features/dashboard/components/cards/new-insurance-card.spec.tsx
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/cards/new-insurance-card.tsx apps/web/src/features/dashboard/components/cards/new-insurance-card.spec.tsx
git commit -m "feat(web): add NewInsuranceCard component (SCRUM-25)"
```

---

### Task 15: Create Renewal7dCard component

**Files:**

- Create: `apps/web/src/features/dashboard/components/cards/renewal-7d-card.tsx`
- Create: `apps/web/src/features/dashboard/components/cards/renewal-7d-card.spec.tsx`

- [ ] **Step 1: Write failing test**

Create spec:

```tsx
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Renewal7dCard } from './renewal-7d-card'

afterEach(cleanup)

describe('Renewal7dCard', () => {
  it('renders loading skeleton', () => {
    render(
      <Renewal7dCard count={undefined} premiumCents={undefined} isLoading />
    )
    expect(screen.getByTestId('renewal-7d-card-loading')).toBeInTheDocument()
  })

  it('renders count and formatted premium', () => {
    render(
      <Renewal7dCard count={7} premiumCents={2_345_000} isLoading={false} />
    )
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 23\.450,00/)).toBeInTheDocument()
  })

  it('links to /policies with filter=expiring-7d', () => {
    render(<Renewal7dCard count={7} premiumCents={0} isLoading={false} />)
    const link = screen.getByRole('link', { name: /renovações/i })
    expect(link.getAttribute('href')).toBe('/policies?filter=expiring-7d')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @app/web exec vitest run src/features/dashboard/components/cards/renewal-7d-card.spec.tsx
```

- [ ] **Step 3: Implement**

Create `apps/web/src/features/dashboard/components/cards/renewal-7d-card.tsx`:

```tsx
'use client'

import { RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'

interface Renewal7dCardProps {
  readonly count: number | undefined
  readonly premiumCents: number | undefined
  readonly isLoading: boolean
}

export function Renewal7dCard({
  count,
  premiumCents,
  isLoading,
}: Renewal7dCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="renewal-7d-card-loading">
        <CardPanel className="flex items-center gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </CardPanel>
      </Card>
    )
  }

  const safeCount = count ?? 0
  const safePremium = premiumCents ?? 0

  return (
    <Card>
      <Link
        href="/policies?filter=expiring-7d"
        className="focus-visible:outline-primary block rounded-xl focus-visible:outline-2"
        aria-label={`${safeCount} renovações nos próximos 7 dias, ver lista`}
      >
        <CardPanel className="flex items-center gap-4">
          <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <RefreshCw className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-sm">
              Renovação 7 dias
            </p>
            <p className="truncate text-2xl font-semibold tracking-tight">
              {safeCount}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {formatCurrency(safePremium)} em prêmio
            </p>
          </div>
        </CardPanel>
      </Link>
    </Card>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/cards/renewal-7d-card.tsx apps/web/src/features/dashboard/components/cards/renewal-7d-card.spec.tsx
git commit -m "feat(web): add Renewal7dCard with premium total (SCRUM-25)"
```

---

### Task 16: Create WarningsCard component

**Files:**

- Create: `apps/web/src/features/dashboard/components/cards/warnings-card.tsx`
- Create: `apps/web/src/features/dashboard/components/cards/warnings-card.spec.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WarningsCard } from './warnings-card'

afterEach(cleanup)

describe('WarningsCard', () => {
  it('renders loading skeleton', () => {
    render(<WarningsCard data={undefined} isLoading />)
    expect(screen.getByTestId('warnings-card-loading')).toBeInTheDocument()
  })

  it('renders total + breakdown with 2 separate links', () => {
    render(
      <WarningsCard
        data={{ total: 8, claimsOpen: 5, assistancesOpen: 3 }}
        isLoading={false}
      />
    )
    expect(screen.getByText('8')).toBeInTheDocument()

    const claimsLink = screen.getByRole('link', { name: /5 sinistros/i })
    expect(claimsLink.getAttribute('href')).toBe('/claims?statusGroup=open')

    const assistLink = screen.getByRole('link', { name: /3 assistências/i })
    expect(assistLink.getAttribute('href')).toBe(
      '/assistances?statusGroup=open'
    )
  })

  it('hides breakdown lines with zero counts', () => {
    render(
      <WarningsCard
        data={{ total: 5, claimsOpen: 5, assistancesOpen: 0 }}
        isLoading={false}
      />
    )
    expect(screen.queryByText(/assistências/i)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement**

Create `apps/web/src/features/dashboard/components/cards/warnings-card.tsx`:

```tsx
'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface WarningsData {
  readonly total: number
  readonly claimsOpen: number
  readonly assistancesOpen: number
}

interface WarningsCardProps {
  readonly data: WarningsData | undefined
  readonly isLoading: boolean
}

export function WarningsCard({ data, isLoading }: WarningsCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="warnings-card-loading">
        <CardPanel className="flex items-start gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-32" />
          </div>
        </CardPanel>
      </Card>
    )
  }

  const total = data?.total ?? 0
  const claimsOpen = data?.claimsOpen ?? 0
  const assistancesOpen = data?.assistancesOpen ?? 0

  return (
    <Card>
      <CardPanel className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-sm">Avisos</p>
          <p className="truncate text-2xl font-semibold tracking-tight">
            {total}
          </p>
          <div className="mt-1 flex flex-col gap-0.5 text-xs">
            {claimsOpen > 0 ? (
              <Link
                href="/claims?statusGroup=open"
                className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                aria-label={`${claimsOpen} sinistros abertos, ver lista`}
              >
                {claimsOpen} sinistros
              </Link>
            ) : null}
            {assistancesOpen > 0 ? (
              <Link
                href="/assistances?statusGroup=open"
                className="text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                aria-label={`${assistancesOpen} assistências abertas, ver lista`}
              >
                {assistancesOpen} assistências
              </Link>
            ) : null}
            {claimsOpen === 0 && assistancesOpen === 0 ? (
              <span className="text-muted-foreground">
                Nenhum aviso em aberto
              </span>
            ) : null}
          </div>
        </div>
      </CardPanel>
    </Card>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/cards/warnings-card.tsx apps/web/src/features/dashboard/components/cards/warnings-card.spec.tsx
git commit -m "feat(web): add WarningsCard with claims+assistances breakdown (SCRUM-25)"
```

---

### Task 17: Create ProposalsPendingCard component with chips

**Files:**

- Create: `apps/web/src/features/dashboard/components/cards/proposals-pending-card.tsx`
- Create: `apps/web/src/features/dashboard/components/cards/proposals-pending-card.spec.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ProposalsPendingCard } from './proposals-pending-card'

afterEach(cleanup)

const PENDING_STAGES = 'CAPTURE,QUOTE,PROTOCOL,INSPECTION,PAYMENT'

describe('ProposalsPendingCard', () => {
  it('renders loading skeleton', () => {
    render(<ProposalsPendingCard data={undefined} isLoading />)
    expect(
      screen.getByTestId('proposals-pending-card-loading')
    ).toBeInTheDocument()
  })

  it('renders total + 3 chips with correct counts', () => {
    render(
      <ProposalsPendingCard
        data={{ total: 19, inDay: 12, warning: 5, critical: 2 }}
        isLoading={false}
      />
    )
    expect(screen.getByText('19')).toBeInTheDocument()
    expect(screen.getByText(/12 em dia/i)).toBeInTheDocument()
    expect(screen.getByText(/5 atenção/i)).toBeInTheDocument()
    expect(screen.getByText(/2 crítico/i)).toBeInTheDocument()
  })

  it('each chip links to proposals page with correct filters', () => {
    render(
      <ProposalsPendingCard
        data={{ total: 19, inDay: 12, warning: 5, critical: 2 }}
        isLoading={false}
      />
    )
    const inDayLink = screen.getByRole('link', { name: /12 em dia/i })
    expect(inDayLink.getAttribute('href')).toContain(`stages=${PENDING_STAGES}`)
    expect(inDayLink.getAttribute('href')).toContain('updatedAtFrom=')

    const criticalLink = screen.getByRole('link', { name: /2 crítico/i })
    expect(criticalLink.getAttribute('href')).toContain('updatedAtTo=')
    expect(criticalLink.getAttribute('href')).not.toContain('updatedAtFrom=')
  })

  it('renders zero chips when all buckets are zero', () => {
    render(
      <ProposalsPendingCard
        data={{ total: 0, inDay: 0, warning: 0, critical: 0 }}
        isLoading={false}
      />
    )
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText(/nenhuma pendente/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement**

Create `apps/web/src/features/dashboard/components/cards/proposals-pending-card.tsx`:

```tsx
'use client'

import { Clock } from 'lucide-react'
import Link from 'next/link'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ProposalsPendingData {
  readonly total: number
  readonly inDay: number
  readonly warning: number
  readonly critical: number
}

interface ProposalsPendingCardProps {
  readonly data: ProposalsPendingData | undefined
  readonly isLoading: boolean
}

const PENDING_STAGES = 'CAPTURE,QUOTE,PROTOCOL,INSPECTION,PAYMENT'
const MS_PER_DAY = 24 * 60 * 60 * 1000

function buildInDayHref(): string {
  const from = new Date(Date.now() - 3 * MS_PER_DAY).toISOString()
  return `/proposals?stages=${PENDING_STAGES}&updatedAtFrom=${encodeURIComponent(from)}`
}

function buildWarningHref(): string {
  const from = new Date(Date.now() - 7 * MS_PER_DAY).toISOString()
  const to = new Date(Date.now() - 3 * MS_PER_DAY).toISOString()
  return `/proposals?stages=${PENDING_STAGES}&updatedAtFrom=${encodeURIComponent(from)}&updatedAtTo=${encodeURIComponent(to)}`
}

function buildCriticalHref(): string {
  const to = new Date(Date.now() - 7 * MS_PER_DAY).toISOString()
  return `/proposals?stages=${PENDING_STAGES}&updatedAtTo=${encodeURIComponent(to)}`
}

interface ChipProps {
  readonly href: string
  readonly label: string
  readonly count: number
  readonly variant: 'success' | 'warning' | 'destructive'
  readonly ariaLabel: string
}

function Chip({ href, label, count, variant, ariaLabel }: ChipProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
        variant === 'success' &&
          'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300',
        variant === 'warning' &&
          'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300',
        variant === 'destructive' &&
          'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300'
      )}
    >
      {count} {label}
    </Link>
  )
}

export function ProposalsPendingCard({
  data,
  isLoading,
}: ProposalsPendingCardProps) {
  if (isLoading) {
    return (
      <Card data-testid="proposals-pending-card-loading">
        <CardPanel className="flex items-start gap-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardPanel>
      </Card>
    )
  }

  const safe = data ?? { total: 0, inDay: 0, warning: 0, critical: 0 }

  return (
    <Card>
      <CardPanel className="flex items-start gap-4">
        <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Clock className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-sm">
            Propostas Pendentes
          </p>
          <p className="truncate text-2xl font-semibold tracking-tight">
            {safe.total}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {safe.total === 0 ? (
              <span className="text-muted-foreground text-xs">
                Nenhuma pendente
              </span>
            ) : (
              <>
                {safe.inDay > 0 ? (
                  <Chip
                    href={buildInDayHref()}
                    label="em dia"
                    count={safe.inDay}
                    variant="success"
                    ariaLabel={`${safe.inDay} propostas em dia, ver lista`}
                  />
                ) : null}
                {safe.warning > 0 ? (
                  <Chip
                    href={buildWarningHref()}
                    label="atenção"
                    count={safe.warning}
                    variant="warning"
                    ariaLabel={`${safe.warning} propostas em atenção, ver lista`}
                  />
                ) : null}
                {safe.critical > 0 ? (
                  <Chip
                    href={buildCriticalHref()}
                    label="crítico"
                    count={safe.critical}
                    variant="destructive"
                    ariaLabel={`${safe.critical} propostas críticas, ver lista`}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardPanel>
    </Card>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/cards/proposals-pending-card.tsx apps/web/src/features/dashboard/components/cards/proposals-pending-card.spec.tsx
git commit -m "feat(web): add ProposalsPendingCard with age chips (SCRUM-25)"
```

---

### Task 18: Extract ActivePolicies and PendingCommissions into standalone cards

**Files:**

- Create: `apps/web/src/features/dashboard/components/cards/active-policies-card.tsx`
- Create: `apps/web/src/features/dashboard/components/cards/pending-commissions-card.tsx`

- [ ] **Step 1: Create ActivePoliciesCard**

```tsx
'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'

import { ComparisonStatCard } from '../comparison-stat-card'
import type { DashboardStats } from '../../lib/constants'

interface Props {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function ActivePoliciesCard({ data, isLoading }: Props) {
  return (
    <Link
      href="/policies?status=ACTIVE"
      aria-label={`${data?.activePolicies ?? 0} apólices ativas, ver lista`}
    >
      <ComparisonStatCard
        title="Apólices ativas"
        value={data?.activePolicies ?? 0}
        icon={<Shield className="size-5" />}
        comparison={data?.comparison.policies}
        isLoading={isLoading}
      />
    </Link>
  )
}
```

- [ ] **Step 2: Create PendingCommissionsCard**

```tsx
'use client'

import { DollarSign } from 'lucide-react'
import Link from 'next/link'

import { formatCurrency } from '@/lib/formatters'

import { ComparisonStatCard } from '../comparison-stat-card'
import type { DashboardStats } from '../../lib/constants'

interface Props {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function PendingCommissionsCard({ data, isLoading }: Props) {
  const pending = data
    ? data.commissionsThisMonth
        .filter(
          (c) =>
            c.status === 'PENDING_COMMERCIAL' || c.status === 'PENDING_ADMIN'
        )
        .reduce((sum, c) => sum + (c._sum.commissionValueInCents ?? 0), 0)
    : 0

  return (
    <Link
      href="/commissions?filter=pending"
      aria-label={`${formatCurrency(pending)} em comissões pendentes, ver lista`}
    >
      <ComparisonStatCard
        title="Comissões pendentes"
        value={formatCurrency(pending)}
        icon={<DollarSign className="size-5" />}
        comparison={data?.comparison.commissionsPending}
        isLoading={isLoading}
      />
    </Link>
  )
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm --filter @app/web typecheck
git add apps/web/src/features/dashboard/components/cards/
git commit -m "feat(web): extract active-policies and pending-commissions cards (SCRUM-25)"
```

---

### Task 19: Rewrite StatsCards with 6 cards in new order

**Files:**

- Modify: `apps/web/src/features/dashboard/components/stats-cards.tsx` (full rewrite)
- Modify: `apps/web/src/features/dashboard/components/dashboard-content.tsx` (pass `preset` prop)

- [ ] **Step 1: Replace stats-cards.tsx content**

```tsx
'use client'

import type { DashboardPreset, DashboardStats } from '../lib/constants'
import { ActivePoliciesCard } from './cards/active-policies-card'
import { NewInsuranceCard } from './cards/new-insurance-card'
import { PendingCommissionsCard } from './cards/pending-commissions-card'
import { ProposalsPendingCard } from './cards/proposals-pending-card'
import { Renewal7dCard } from './cards/renewal-7d-card'
import { WarningsCard } from './cards/warnings-card'

interface StatsCardsProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
  readonly preset: DashboardPreset
}

export function StatsCards({ data, isLoading, preset }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <NewInsuranceCard
        data={data?.newInsurance}
        isLoading={isLoading}
        preset={preset}
      />
      <Renewal7dCard
        count={data?.renewalsNext7Days}
        premiumCents={data?.renewal7dPremiumCents}
        isLoading={isLoading}
      />
      <ProposalsPendingCard
        data={data?.proposalsPending}
        isLoading={isLoading}
      />
      <WarningsCard data={data?.warnings} isLoading={isLoading} />
      <ActivePoliciesCard data={data} isLoading={isLoading} />
      <PendingCommissionsCard data={data} isLoading={isLoading} />
    </div>
  )
}
```

- [ ] **Step 2: Update DashboardContent to pass preset**

In `apps/web/src/features/dashboard/components/dashboard-content.tsx:99`:

```tsx
<StatsCards data={data} isLoading={isLoading} preset={preset} />
```

- [ ] **Step 3: Verify typecheck + full test**

```bash
pnpm --filter @app/web typecheck
pnpm --filter @app/web test
```

- [ ] **Step 4: Manual visual check (optional)**

```bash
docker compose up -d
pnpm dev
# open http://localhost:3000/dashboard
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/stats-cards.tsx apps/web/src/features/dashboard/components/dashboard-content.tsx
git commit -m "feat(web): rewrite StatsCards with 6-card consolidated layout (SCRUM-25)"
```

---

## Phase 7 — Frontend: list pages accept new query params

### Task 20: Wire /policies page to read boardType, createdFrom/To, filter=expiring-7d, status

**Files:**

- Modify: `apps/web/src/app/(dashboard)/policies/page.tsx`
- Modify: `apps/web/src/features/policies/hooks/use-policies-table.ts` (or wherever the query is built)

- [ ] **Step 1: Read current page.tsx + hook**

```bash
cat apps/web/src/app/\(dashboard\)/policies/page.tsx
cat apps/web/src/features/policies/hooks/use-policies-table.ts  # if it exists
```

- [ ] **Step 2: Read search params in page + pass to hook**

Example pattern (adjust based on actual file):

```tsx
// page.tsx — read searchParams from Next 16 App Router
export default function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  // Next.js 16 async params: await searchParams
  return <PoliciesContent searchParams={searchParams} />
}
```

In the hook that calls the API, thread these into the Orval React Query call:

```ts
const { data } = useListPolicies({
  status: filters.status,
  boardType: filters.boardType,
  createdFrom: filters.createdFrom,
  createdTo: filters.createdTo,
  // ... existing filters
})
```

- [ ] **Step 3: Handle `filter=expiring-7d` shortcut on the frontend**

Since `filter=expiring-7d` is not a backend schema field, the frontend should convert it to the existing API params:

```ts
if (filterParam === 'expiring-7d') {
  filters.status = 'ACTIVE'
  filters.endDateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  filters.endDateFrom = new Date()
}
```

**Note:** this requires backend also accepting `endDateFrom`/`endDateTo` on policies. **If not present, either:** (a) add them to the backend (same pattern as Task 10), or (b) filter client-side (acceptable if page size is small). Pick option (a) for consistency — add a sub-task at the end of this task if not already supported.

- [ ] **Step 4: Display current filters in the UI (filter chip/pill showing "Expirando em 7 dias")**

If the page has a filter display area, show which filter is active so users understand the filtered view.

- [ ] **Step 5: Run typecheck + manual test**

```bash
pnpm --filter @app/web typecheck
# Visually check in browser that clicking Renewal7dCard lands on /policies?filter=expiring-7d and shows filtered results
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/policies/ apps/web/src/features/policies/
git commit -m "feat(web): wire /policies page to accept dashboard deep-link filters (SCRUM-25)"
```

---

### Task 21: Wire /proposals page to read stages, updatedAtFrom/To

**Files:**

- Modify: `apps/web/src/app/(dashboard)/proposals/page.tsx`
- Modify: `apps/web/src/features/proposals/hooks/use-proposals-table.ts`

- [ ] **Step 1: Read current page + hook**

Same pattern as Task 20.

- [ ] **Step 2: Parse `stages` CSV from URL**

```ts
const stagesParam = searchParams.get('stages')
const stages = stagesParam?.split(',').filter(Boolean) as
  | ProposalStage[]
  | undefined
```

Pass `stages`, `updatedAtFrom`, `updatedAtTo` to the Orval-generated `useListProposals` call.

- [ ] **Step 3: Display active filter in UI**

Show which filter group is active (e.g., "Propostas em atenção" chip above the table when age bucket is set).

- [ ] **Step 4: Run typecheck + manual test**

Click each chip on ProposalsPendingCard → verify URL is correct → verify filtered result.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/proposals/ apps/web/src/features/proposals/
git commit -m "feat(web): wire /proposals page to accept stages CSV + age range (SCRUM-25)"
```

---

### Task 22: Wire /claims and /assistances pages to read statusGroup

**Files:**

- Modify: `apps/web/src/app/(dashboard)/claims/page.tsx` + hooks
- Modify: `apps/web/src/app/(dashboard)/assistances/page.tsx` + hooks

- [ ] **Step 1: For each page, read statusGroup from URL + pass to API hook**

```ts
const statusGroup = searchParams.get('statusGroup') as 'open' | 'closed' | null
// pass to useListClaims / useListAssistances
```

- [ ] **Step 2: Display active filter chip**

Show "Status: abertos" banner when active.

- [ ] **Step 3: Typecheck + manual test**

```bash
pnpm --filter @app/web typecheck
# Click WarningsCard links, verify filtered lists
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/claims/ apps/web/src/app/\(dashboard\)/assistances/ apps/web/src/features/claims/ apps/web/src/features/assistances/
git commit -m "feat(web): wire /claims and /assistances to statusGroup filter (SCRUM-25)"
```

---

## Phase 8 — Polish

### Task 23: Rename AlertsWidget title

**Files:**

- Modify: `apps/web/src/features/dashboard/components/alerts-widget.tsx` (title only)

- [ ] **Step 1: Replace CardTitle text**

In `apps/web/src/features/dashboard/components/alerts-widget.tsx`, replace all 3 occurrences of `"Alertas Ativos"` with `"Itens que precisam de atenção"`.

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm --filter @app/web lint
pnpm --filter @app/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/dashboard/components/alerts-widget.tsx
git commit -m "chore(web): rename AlertsWidget title to Itens que precisam de atenção (SCRUM-25)"
```

---

### Task 24: Full quality gate run

**Files:** none (verification only)

- [ ] **Step 1: Lint**

```bash
pnpm lint
```

Expected: 0 errors across all packages.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: successful build of all apps and packages.

- [ ] **Step 4: Test**

```bash
pnpm test
```

Expected: all unit + integration tests pass.

- [ ] **Step 5: If any gate fails → fix and repeat**

Do not proceed to QA until all 4 gates green.

---

### Task 25: QA Playwright (manual, post-merge-candidate)

**Files:**

- Create: `audit/scrum-25/` — screenshots + QA notes

- [ ] **Step 1: Start local env**

```bash
docker compose up -d
pnpm dev
```

- [ ] **Step 2: Playwright via MCP — golden path**

Open http://localhost:3000/dashboard and verify:

- [ ] 6 stats cards visible in order: Seguro Novo → Renovação 7d → Propostas Pendentes → Avisos → Apólices ativas → Comissões pendentes
- [ ] Grid: 3 cols on desktop (1440px), 2 cols on tablet (~768px), 1 col on mobile (375px)
- [ ] Loading state → success without flicker
- [ ] Click Seguro Novo → lands on `/policies?boardType=NEW_INSURANCE&createdFrom=...` → filtered table visible
- [ ] Click Renovação 7d → `/policies?filter=expiring-7d` → filtered
- [ ] Click each chip in Propostas Pendentes → lands on `/proposals?stages=...&updatedAtFrom/To=...` → filtered
- [ ] Click sinistros link in Avisos → `/claims?statusGroup=open` → filtered
- [ ] Click assistências link in Avisos → `/assistances?statusGroup=open` → filtered
- [ ] Dark mode: chips maintain AA contrast (use browser devtools)
- [ ] AlertsWidget renamed to "Itens que precisam de atenção" and still functions
- [ ] No regressions in other dashboard widgets (BrokerRanking, ProposalsByStage chart, etc.)

- [ ] **Step 3: Save screenshots to `audit/scrum-25/`**

Desktop + mobile screenshots of dashboard + each filtered list page. Name: `desktop-dashboard.png`, `mobile-dashboard.png`, `desktop-policies-new.png`, etc.

- [ ] **Step 4: If any QA check fails → fix → re-run code review → re-run QA**

- [ ] **Step 5: Commit QA artifacts**

```bash
git add audit/scrum-25/
git commit -m "test(qa): SCRUM-25 Playwright QA evidence"
```

---

### Task 26: Open PR

- [ ] **Step 1: Push branch + open PR**

```bash
git push -u origin feat/scrum-25-dashboard-cards
gh pr create --title "feat: SCRUM-25 dashboard cards Fase 1 (4 new cards + deep-link)" --body "$(cat <<'EOF'
## Summary
- Consolidates dashboard into 6 cards: Seguro Novo, Renovação 7d expandida, Propostas Pendentes (with age chips), Avisos (claims+assistances), Apólices ativas, Comissões pendentes.
- Extends `GET /api/v1/stats/dashboard` with new aggregates (parallelized).
- Adds deep-link filters on `/policies`, `/proposals`, `/claims`, `/assistances`.
- Renames AlertsWidget title to "Itens que precisam de atenção".

Fora do escopo (tickets separados): Metas, Funil de Leads.

Spec: docs/superpowers/specs/2026-04-17-scrum-25-dashboard-cards-design.md
Plan: docs/superpowers/plans/2026-04-17-scrum-25-dashboard-cards.md

## Test plan
- [x] Unit tests green (stats-helpers, card components, list filters)
- [x] Integration test: dashboard tenant isolation + bucketing
- [x] QA Playwright: 6 cards render, clicks deep-link correctly (screenshots in audit/scrum-25/)
- [x] Dark mode contrast AA
- [x] Responsive (375px / 1440px)
- [x] Lint, typecheck, build, test gates green

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Monitor CI, respond to review**

---

## Self-Review

**1. Spec coverage:**

| Spec section                                     | Task(s)                            |
| ------------------------------------------------ | ---------------------------------- |
| Cards finais / ordem                             | 14, 15, 16, 17, 18, 19             |
| Seguro Novo definition (boardType NEW_INSURANCE) | 3 (helper) + 14 (card)             |
| Renovação 7d expansion (premium)                 | 4 (helper) + 15 (card)             |
| Avisos (claim + assistance combined)             | 5 (helper) + 16 (card)             |
| Propostas Pendentes buckets                      | 1 (index) + 6 (helper) + 17 (card) |
| Layout 3x2 grid                                  | 19                                 |
| AlertsWidget rename                              | 23                                 |
| Backend schema extension                         | 2, 7                               |
| Prisma index                                     | 1                                  |
| Deep-link /policies                              | 10 + 20                            |
| Deep-link /proposals                             | 9 + 21                             |
| Deep-link /claims                                | 11 + 22                            |
| Deep-link /assistances                           | 12 + 22                            |
| Unit tests                                       | 3, 4, 5, 6, 9-12, 14-17            |
| Integration tests                                | 8                                  |
| QA Playwright                                    | 25                                 |
| Quality gates                                    | 24                                 |
| PDF report (regression)                          | 7 step 6                           |

All spec sections covered.

**2. Placeholder scan:** No "TBD"/"TODO"/"similar to Task N" patterns. Task 8 has "placeholder showing the shape" but the step explicitly instructs the implementer to fill in concrete seeds before commit. Task 20 has "If not present, either..." — acceptable since it's a contingency path, not an incomplete step.

**3. Type consistency:**

- `MetricComparison` reused across helpers + schema. ✓
- `WarningsStats` introduced in Task 5, used in Task 7. ✓
- `ProposalsPendingBuckets` introduced in Task 6, used in Task 7. ✓
- `ComparisonMetric` interface in frontend card (Task 14) aligns with `metricComparisonSchema` in backend. ✓
- URL convention `?statusGroup=open` consistent between Task 11/12 (backend) and Task 16/22 (frontend).
- The spec originally wrote `?status=open` but Task 11 reconciles to `?statusGroup=open` and the card spec (Task 16) uses `statusGroup=open` too.

**4. Spec drift note:** The spec table said `/claims?status=open` / `/assistances?status=open`. The plan resolves this to `?statusGroup=open` because `'open'` isn't a valid ClaimStatus. This is a **tightening**, not a contradiction — `statusGroup` is semantically clearer. The spec will need a minor post-commit edit or the plan can note it (documented in Task 11 Step 5 and Task 16 test).

All tasks hold independent value and commit boundaries make sense. Plan is ready.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-17-scrum-25-dashboard-cards.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration, lower context usage.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
