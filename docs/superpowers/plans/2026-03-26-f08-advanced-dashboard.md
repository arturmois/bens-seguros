# F08 Sub-projeto 1 — Advanced Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add period filters (presets), comparison metrics (% vs previous period), and 3 new financial KPIs to the existing dashboard.

**Architecture:** Expand the existing `/stats/dashboard` endpoint to accept a `preset` parameter and return comparison data. Frontend adds a period filter bar, refactors existing KPI cards to show comparisons, and adds a new financial metrics row. All using existing Recharts + @coss/style design system with theme support.

**Tech Stack:** Prisma (queries), Zod (validation), React Query, Recharts, Tailwind CSS

**Run commands:**

- Tests: `pnpm test`
- Lint: `pnpm lint`
- Build: `pnpm build`
- Server only: `cd apps/server && pnpm build`
- Web only: `pnpm build --filter=@app/web`

---

## File Structure

**Backend:**

- Modify: `apps/server/src/schemas/stats.schemas.ts` — add preset validation
- Modify: `apps/server/src/routes/v1/stats-routes.ts` — expand endpoint with comparison queries

**Frontend — Types:**

- Modify: `apps/web/src/features/dashboard/types/index.ts` — add ComparisonMetric, expand DashboardStats

**Frontend — New Components:**

- Create: `apps/web/src/features/dashboard/components/dashboard-period-filter.tsx`
- Create: `apps/web/src/features/dashboard/components/comparison-stat-card.tsx`
- Create: `apps/web/src/features/dashboard/components/financial-metrics.tsx`

**Frontend — Modified Components:**

- Modify: `apps/web/src/features/dashboard/hooks/use-dashboard-stats.ts` — accept preset param
- Modify: `apps/web/src/features/dashboard/components/dashboard-content.tsx` — add filter + financial row
- Modify: `apps/web/src/features/dashboard/components/stats-cards.tsx` — use ComparisonStatCard

---

### Task 1: Backend — Expand stats schema and endpoint

**Files:**

- Modify: `apps/server/src/schemas/stats.schemas.ts`
- Modify: `apps/server/src/routes/v1/stats-routes.ts`

- [ ] **Step 1: Read current files**

Read `apps/server/src/schemas/stats.schemas.ts` and `apps/server/src/routes/v1/stats-routes.ts` completely.

- [ ] **Step 2: Update schema to accept preset**

Replace `apps/server/src/schemas/stats.schemas.ts`:

```typescript
import { z } from 'zod'

const VALID_PRESETS = ['7d', '30d', '90d', '6m'] as const

export const dashboardStatsQuerySchema = z.object({
  preset: z.enum(VALID_PRESETS).default('30d'),
})

export type DashboardPreset = (typeof VALID_PRESETS)[number]

export function presetToDays(preset: DashboardPreset): number {
  const map: Record<DashboardPreset, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '6m': 180,
  }
  return map[preset]
}
```

- [ ] **Step 3: Update stats-routes.ts to calculate comparison data**

Modify `apps/server/src/routes/v1/stats-routes.ts`. The endpoint now:

1. Parses `preset` from query (instead of `months`)
2. Calculates `currentFrom`/`currentTo` and `previousFrom`/`previousTo` date ranges
3. Runs all existing queries (filtered by current period where applicable)
4. Runs comparison queries for both periods
5. Adds 3 new financial metrics: totalPremium, averageTicket, commissionsReceivable

```typescript
import { prisma } from '@repo/db'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import {
  dashboardStatsQuerySchema,
  presetToDays,
} from '../../schemas/stats.schemas.js'

function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.get(
    '/api/v1/stats/dashboard',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { preset } = dashboardStatsQuerySchema.parse(request.query)
      const orgId = request.organizationId!
      const now = new Date()
      const days = presetToDays(preset)

      const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const previousFrom = new Date(
        now.getTime() - 2 * days * 24 * 60 * 60 * 1000
      )
      const previousTo = currentFrom

      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      )

      // Existing queries (unchanged, except commissions uses currentFrom)
      const [
        proposalsByStage,
        activePolicies,
        expiringPolicies,
        claimsByPriority,
        commissionsThisMonth,
        conversionRate,
        monthlyTrends,
      ] = await Promise.all([
        prisma.proposal.groupBy({
          by: ['stage'],
          where: {
            organizationId: orgId,
            deletedAt: null,
            stage: { notIn: ['POLICY_ISSUED', 'LOST'] },
          },
          _count: true,
        }),

        prisma.policy.count({
          where: { organizationId: orgId, status: 'ACTIVE', deletedAt: null },
        }),

        prisma.policy.count({
          where: {
            organizationId: orgId,
            status: 'ACTIVE',
            endDate: { lte: thirtyDaysFromNow, gte: now },
            deletedAt: null,
          },
        }),

        prisma.claim.groupBy({
          by: ['priority'],
          where: {
            organizationId: orgId,
            status: { notIn: ['COMPLETED', 'REJECTED'] },
            deletedAt: null,
          },
          _count: true,
        }),

        prisma.commission.groupBy({
          by: ['status'],
          where: {
            organizationId: orgId,
            createdAt: { gte: currentFrom },
            deletedAt: null,
          },
          _sum: { commissionValueInCents: true },
          _count: true,
        }),

        Promise.all([
          prisma.proposal.count({
            where: {
              organizationId: orgId,
              createdAt: { gte: currentFrom },
              deletedAt: null,
            },
          }),
          prisma.proposal.count({
            where: {
              organizationId: orgId,
              stage: 'POLICY_ISSUED',
              createdAt: { gte: currentFrom },
              deletedAt: null,
            },
          }),
        ]).then(([total, issued]) => ({
          total,
          issued,
          rate: total > 0 ? Math.round((issued / total) * 100) : 0,
        })),

        prisma.$queryRaw`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
            COUNT(*) FILTER (WHERE "stage" != 'LOST')::int as proposals,
            COUNT(*) FILTER (WHERE "stage" = 'POLICY_ISSUED')::int as issued
          FROM "Proposal"
          WHERE "organizationId" = ${orgId}
            AND "createdAt" >= ${currentFrom}
            AND "deletedAt" IS NULL
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month
        `,
      ])

      // Comparison queries — current vs previous period
      const [
        currentProposals,
        previousProposals,
        currentPolicies,
        previousPolicies,
        currentClaims,
        previousClaims,
        currentPendingCommissions,
        previousPendingCommissions,
        currentPremium,
        previousPremium,
        commissionsReceivable,
      ] = await Promise.all([
        prisma.proposal.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: currentFrom, lte: now },
            deletedAt: null,
          },
        }),
        prisma.proposal.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: previousFrom, lt: previousTo },
            deletedAt: null,
          },
        }),
        prisma.policy.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: currentFrom, lte: now },
            deletedAt: null,
          },
        }),
        prisma.policy.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: previousFrom, lt: previousTo },
            deletedAt: null,
          },
        }),
        prisma.claim.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: currentFrom, lte: now },
            deletedAt: null,
          },
        }),
        prisma.claim.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: previousFrom, lt: previousTo },
            deletedAt: null,
          },
        }),
        prisma.commission.aggregate({
          where: {
            organizationId: orgId,
            status: { in: ['PENDING_COMMERCIAL', 'PENDING_ADMIN'] },
            createdAt: { gte: currentFrom, lte: now },
            deletedAt: null,
          },
          _sum: { commissionValueInCents: true },
        }),
        prisma.commission.aggregate({
          where: {
            organizationId: orgId,
            status: { in: ['PENDING_COMMERCIAL', 'PENDING_ADMIN'] },
            createdAt: { gte: previousFrom, lt: previousTo },
            deletedAt: null,
          },
          _sum: { commissionValueInCents: true },
        }),
        prisma.policy.aggregate({
          where: {
            organizationId: orgId,
            createdAt: { gte: currentFrom, lte: now },
            deletedAt: null,
          },
          _sum: { premiumValueInCents: true },
          _count: true,
        }),
        prisma.policy.aggregate({
          where: {
            organizationId: orgId,
            createdAt: { gte: previousFrom, lt: previousTo },
            deletedAt: null,
          },
          _sum: { premiumValueInCents: true },
          _count: true,
        }),
        prisma.commission.aggregate({
          where: {
            organizationId: orgId,
            status: 'APPROVED',
            paidAt: null,
            deletedAt: null,
          },
          _sum: { commissionValueInCents: true },
        }),
      ])

      const currentPendingCents =
        currentPendingCommissions._sum.commissionValueInCents ?? 0
      const previousPendingCents =
        previousPendingCommissions._sum.commissionValueInCents ?? 0
      const currentPremiumCents = currentPremium._sum.premiumValueInCents ?? 0
      const previousPremiumCents = previousPremium._sum.premiumValueInCents ?? 0
      const currentPolicyCount = currentPremium._count
      const previousPolicyCount = previousPremium._count
      const currentTicket =
        currentPolicyCount > 0
          ? Math.round(currentPremiumCents / currentPolicyCount)
          : 0
      const previousTicket =
        previousPolicyCount > 0
          ? Math.round(previousPremiumCents / previousPolicyCount)
          : 0

      return reply.send({
        success: true,
        data: {
          proposalsByStage,
          activePolicies,
          expiringPolicies,
          claimsByPriority,
          commissionsThisMonth,
          conversionRate,
          monthlyTrends,
          comparison: {
            proposals: {
              current: currentProposals,
              previous: previousProposals,
              changePercent: calculateChangePercent(
                currentProposals,
                previousProposals
              ),
            },
            policies: {
              current: currentPolicies,
              previous: previousPolicies,
              changePercent: calculateChangePercent(
                currentPolicies,
                previousPolicies
              ),
            },
            claims: {
              current: currentClaims,
              previous: previousClaims,
              changePercent: calculateChangePercent(
                currentClaims,
                previousClaims
              ),
            },
            commissionsPending: {
              current: currentPendingCents,
              previous: previousPendingCents,
              changePercent: calculateChangePercent(
                currentPendingCents,
                previousPendingCents
              ),
            },
          },
          totalPremium: {
            current: currentPremiumCents,
            previous: previousPremiumCents,
            changePercent: calculateChangePercent(
              currentPremiumCents,
              previousPremiumCents
            ),
          },
          averageTicket: {
            current: currentTicket,
            previous: previousTicket,
            changePercent: calculateChangePercent(
              currentTicket,
              previousTicket
            ),
          },
          commissionsReceivable:
            commissionsReceivable._sum.commissionValueInCents ?? 0,
        },
      })
    }
  )
}
```

- [ ] **Step 4: Verify server builds and tests pass**

Run: `cd /home/artur/projects && pnpm build --filter=@app/server && pnpm test`
Expected: Build succeeds, all tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/schemas/stats.schemas.ts apps/server/src/routes/v1/stats-routes.ts
git commit -m "feat(server): expand dashboard stats endpoint with period presets and comparison metrics (F08)"
```

---

### Task 2: Frontend — Update types and hook

**Files:**

- Modify: `apps/web/src/features/dashboard/types/index.ts`
- Modify: `apps/web/src/features/dashboard/hooks/use-dashboard-stats.ts`

- [ ] **Step 1: Update types**

Add `ComparisonMetric` and expand `DashboardStats` in `apps/web/src/features/dashboard/types/index.ts`:

```typescript
export interface ProposalByStage {
  stage: string
  _count: number
}

export interface ClaimByPriority {
  priority: string
  _count: number
}

export interface CommissionByStatus {
  status: string
  _count: number
  _sum: { commissionValueInCents: number | null }
}

export interface ConversionRate {
  total: number
  issued: number
  rate: number
}

export interface MonthlyTrend {
  month: string
  proposals: string
  issued: string
}

export interface ComparisonMetric {
  readonly current: number
  readonly previous: number
  readonly changePercent: number
}

export interface DashboardStats {
  proposalsByStage: ProposalByStage[]
  activePolicies: number
  expiringPolicies: number
  claimsByPriority: ClaimByPriority[]
  commissionsThisMonth: CommissionByStatus[]
  conversionRate: ConversionRate
  monthlyTrends: MonthlyTrend[]
  comparison: {
    proposals: ComparisonMetric
    policies: ComparisonMetric
    claims: ComparisonMetric
    commissionsPending: ComparisonMetric
  }
  totalPremium: ComparisonMetric
  averageTicket: ComparisonMetric
  commissionsReceivable: number
}

export type DashboardPreset = '7d' | '30d' | '90d' | '6m'
```

- [ ] **Step 2: Update hook to accept preset**

Replace `apps/web/src/features/dashboard/hooks/use-dashboard-stats.ts`:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import { getActiveOrgCookie } from '@/lib/org-cookie'

import type { DashboardPreset, DashboardStats } from '../types'

const DASHBOARD_STATS_KEY = 'dashboard-stats'

export function useDashboardStats(preset: DashboardPreset = '30d') {
  const hasActiveOrg = !!getActiveOrgCookie()

  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY, preset],
    queryFn: async () => {
      const response = await api.get<DashboardStats>(
        `/api/v1/stats/dashboard?preset=${preset}`
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: hasActiveOrg,
  })
}
```

- [ ] **Step 3: Verify build**

Run: `cd /home/artur/projects && pnpm build --filter=@app/web`
Expected: Build succeeds (existing components still work because new fields are additive)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/dashboard/types/index.ts apps/web/src/features/dashboard/hooks/use-dashboard-stats.ts
git commit -m "feat(web): update dashboard types and hook to support preset filter (F08)"
```

---

### Task 3: Frontend — Period filter and ComparisonStatCard components

**Files:**

- Create: `apps/web/src/features/dashboard/components/dashboard-period-filter.tsx`
- Create: `apps/web/src/features/dashboard/components/comparison-stat-card.tsx`

- [ ] **Step 1: Create period filter component**

```typescript
// apps/web/src/features/dashboard/components/dashboard-period-filter.tsx
'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { DashboardPreset } from '../types'

const PRESETS: Array<{ readonly value: DashboardPreset; readonly label: string }> = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '6m', label: '6 meses' },
]

interface DashboardPeriodFilterProps {
  readonly preset: DashboardPreset
  readonly onPresetChange: (preset: DashboardPreset) => void
}

export function DashboardPeriodFilter({
  preset,
  onPresetChange,
}: DashboardPeriodFilterProps) {
  return (
    <div className="flex gap-1">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          variant={preset === p.value ? 'default' : 'outline'}
          size="sm"
          className={cn('h-7 px-3 text-xs')}
          onClick={() => onPresetChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create comparison stat card component**

```typescript
// apps/web/src/features/dashboard/components/comparison-stat-card.tsx
'use client'

import { TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardPanel } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { ComparisonMetric } from '../types'

interface ComparisonStatCardProps {
  readonly title: string
  readonly value: string | number
  readonly icon: React.ReactNode
  readonly comparison?: ComparisonMetric
  readonly isLoading?: boolean
}

export function ComparisonStatCard({
  title,
  value,
  icon,
  comparison,
  isLoading,
}: ComparisonStatCardProps) {
  if (isLoading) {
    return (
      <Card>
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

  const isPositive = comparison ? comparison.changePercent >= 0 : true
  const showComparison = comparison && comparison.previous > 0

  return (
    <Card>
      <CardPanel className="flex items-center gap-4">
        <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {showComparison ? (
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
                {comparison.changePercent}%
              </span>
              <span className="text-muted-foreground text-xs">vs anterior</span>
            </div>
          ) : null}
        </div>
      </CardPanel>
    </Card>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `cd /home/artur/projects && pnpm build --filter=@app/web`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/dashboard/components/dashboard-period-filter.tsx apps/web/src/features/dashboard/components/comparison-stat-card.tsx
git commit -m "feat(web): add DashboardPeriodFilter and ComparisonStatCard components (F08)"
```

---

### Task 4: Frontend — Financial metrics component

**Files:**

- Create: `apps/web/src/features/dashboard/components/financial-metrics.tsx`

- [ ] **Step 1: Create financial metrics row**

```typescript
// apps/web/src/features/dashboard/components/financial-metrics.tsx
'use client'

import { Banknote, Receipt, TrendingUp } from 'lucide-react'

import { formatCurrency } from '@/lib/formatters'

import type { DashboardStats } from '../types'
import { ComparisonStatCard } from './comparison-stat-card'

interface FinancialMetricsProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function FinancialMetrics({ data, isLoading }: FinancialMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ComparisonStatCard
        title="Premio total emitido"
        value={data ? formatCurrency(data.totalPremium.current) : '—'}
        icon={<Banknote className="size-5" />}
        comparison={data?.totalPremium}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Ticket medio"
        value={data ? formatCurrency(data.averageTicket.current) : '—'}
        icon={<TrendingUp className="size-5" />}
        comparison={data?.averageTicket}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Comissoes a receber"
        value={data ? formatCurrency(data.commissionsReceivable) : '—'}
        icon={<Receipt className="size-5" />}
        isLoading={isLoading}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /home/artur/projects && pnpm build --filter=@app/web`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/dashboard/components/financial-metrics.tsx
git commit -m "feat(web): add FinancialMetrics component with premium, ticket, receivable (F08)"
```

---

### Task 5: Frontend — Integrate everything into dashboard

**Files:**

- Modify: `apps/web/src/features/dashboard/components/dashboard-content.tsx`
- Modify: `apps/web/src/features/dashboard/components/stats-cards.tsx`

- [ ] **Step 1: Read current dashboard-content.tsx and stats-cards.tsx**

Read both files completely.

- [ ] **Step 2: Update stats-cards.tsx to use ComparisonStatCard**

Replace the existing `StatCard` with `ComparisonStatCard` and pass comparison data:

```typescript
// apps/web/src/features/dashboard/components/stats-cards.tsx
'use client'

import { FileText, Shield, AlertTriangle, DollarSign } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/formatters'

import type { DashboardStats } from '../types'
import { ComparisonStatCard } from './comparison-stat-card'

interface StatsCardsProps {
  readonly data: DashboardStats | undefined
  readonly isLoading: boolean
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  const activeProposals = data
    ? data.proposalsByStage.reduce((sum, s) => sum + s._count, 0)
    : 0
  const openClaims = data
    ? data.claimsByPriority.reduce((sum, c) => sum + c._count, 0)
    : 0
  const pendingCommissions = data
    ? data.commissionsThisMonth
        .filter(
          (c) =>
            c.status === 'PENDING_COMMERCIAL' || c.status === 'PENDING_ADMIN'
        )
        .reduce((sum, c) => sum + (c._sum.commissionValueInCents ?? 0), 0)
    : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ComparisonStatCard
        title="Propostas ativas"
        value={activeProposals}
        icon={<FileText className="size-5" />}
        comparison={data?.comparison.proposals}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Apolices ativas"
        value={data?.activePolicies ?? 0}
        icon={<Shield className="size-5" />}
        comparison={data?.comparison.policies}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Sinistros abertos"
        value={openClaims}
        icon={<AlertTriangle className="size-5" />}
        comparison={data?.comparison.claims}
        isLoading={isLoading}
      />
      <ComparisonStatCard
        title="Comissoes pendentes"
        value={formatCurrency(pendingCommissions)}
        icon={<DollarSign className="size-5" />}
        comparison={data?.comparison.commissionsPending}
        isLoading={isLoading}
      />
    </div>
  )
}
```

Note: The `expiringPolicies` badge is removed to keep the card clean with the comparison metric. The expiring policies info is still available in the Alerts widget.

- [ ] **Step 3: Update dashboard-content.tsx to add filter and financial metrics**

Modify `apps/web/src/features/dashboard/components/dashboard-content.tsx`:

Add `useState` for preset, render `DashboardPeriodFilter` in the header area, pass preset to `useDashboardStats`, and render `FinancialMetrics` after `StatsCards`.

```typescript
// apps/web/src/features/dashboard/components/dashboard-content.tsx
'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Card, CardPanel } from '@/components/ui/card'

import { useDashboardStats } from '../hooks/use-dashboard-stats'
import type { DashboardPreset } from '../types'
import { ConversionRate } from './conversion-rate'
import { DashboardPeriodFilter } from './dashboard-period-filter'
import { FinancialMetrics } from './financial-metrics'
import { StatsCards } from './stats-cards'

function ChartSkeleton() {
  return (
    <Card>
      <CardPanel className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </CardPanel>
    </Card>
  )
}

const ProposalsByStage = dynamic(
  () => import('./proposals-by-stage').then((m) => m.ProposalsByStage),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const CommissionsSummary = dynamic(
  () => import('./commissions-summary').then((m) => m.CommissionsSummary),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const ClaimsByPriority = dynamic(
  () => import('./claims-by-priority').then((m) => m.ClaimsByPriority),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const AlertsWidget = dynamic(
  () => import('./alerts-widget').then((m) => m.AlertsWidget),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const TrendChart = dynamic(
  () => import('./trend-chart').then((m) => m.TrendChart),
  { loading: () => <ChartSkeleton />, ssr: false }
)

export function DashboardContent() {
  const [preset, setPreset] = useState<DashboardPreset>('30d')
  const { data, isLoading, isError, refetch } = useDashboardStats(preset)

  if (isError) {
    return (
      <Card>
        <CardPanel className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertTriangle className="text-destructive size-8" />
          <p className="text-muted-foreground text-sm">
            Erro ao carregar dados do dashboard.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </CardPanel>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <DashboardPeriodFilter preset={preset} onPresetChange={setPreset} />
      </div>
      <StatsCards data={data} isLoading={isLoading} />
      <FinancialMetrics data={data} isLoading={isLoading} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProposalsByStage data={data?.proposalsByStage} isLoading={isLoading} />
        <CommissionsSummary
          data={data?.commissionsThisMonth}
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ConversionRate data={data?.conversionRate} isLoading={isLoading} />
        <ClaimsByPriority data={data?.claimsByPriority} isLoading={isLoading} />
        <AlertsWidget />
      </div>
      <TrendChart data={data?.monthlyTrends} isLoading={isLoading} />
    </div>
  )
}
```

- [ ] **Step 4: Verify full build**

Run: `cd /home/artur/projects && pnpm build --filter=@app/web`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/dashboard-content.tsx apps/web/src/features/dashboard/components/stats-cards.tsx
git commit -m "feat(web): integrate period filter, comparison KPIs, and financial metrics into dashboard (F08)"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full test suite**

Run: `cd /home/artur/projects && pnpm test`
Expected: All tests PASS

- [ ] **Step 2: Run lint and build**

Run: `cd /home/artur/projects && pnpm lint && pnpm build`
Expected: Zero errors, build succeeds

- [ ] **Step 3: Update feature backlog**

In `docs/plans/features/README.md`, add note that F08 sub-projeto 1 is implemented.

- [ ] **Step 4: Commit**

```bash
git add docs/plans/features/README.md
git commit -m "docs: mark F08 sub-projeto 1 (filters + comparatives) as implemented"
```
