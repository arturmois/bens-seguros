import type { ClaimPriority, CommissionStatus, ProposalStage } from '@repo/db'
import { prisma } from '@repo/db'

import type { DashboardPreset } from '../../schemas/stats.schemas.js'
import { presetToDays } from '../../schemas/stats.schemas.js'

export function calculateChangePercent(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

interface DateRange {
  readonly currentFrom: Date
  readonly previousFrom: Date
  readonly previousTo: Date
  readonly now: Date
  readonly thirtyDaysFromNow: Date
}

interface MetricComparison {
  readonly current: number
  readonly previous: number
  readonly changePercent: number
}

interface ConversionRate {
  readonly total: number
  readonly issued: number
  readonly rate: number
}

interface MonthlyTrendRow {
  readonly month: string
  readonly proposals: number
  readonly issued: number
}

interface ProposalByStage {
  readonly stage: ProposalStage
  readonly _count: number
}

interface ClaimByPriority {
  readonly priority: ClaimPriority
  readonly _count: number
}

interface CommissionByStatus {
  readonly status: CommissionStatus
  readonly _count: number
  readonly _sum: { readonly commissionValueInCents: number | null }
}

export interface DashboardData {
  readonly proposalsByStage: readonly ProposalByStage[]
  readonly activePolicies: number
  readonly expiringPolicies: number
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
}

function buildDateRanges(preset: DashboardPreset): DateRange {
  const now = new Date()
  const days = presetToDays(preset)
  const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const previousFrom = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000)
  const previousTo = currentFrom
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return { currentFrom, previousFrom, previousTo, now, thirtyDaysFromNow }
}

async function fetchChartData(orgId: string, ranges: DateRange) {
  const { currentFrom, thirtyDaysFromNow, now } = ranges
  return Promise.all([
    prisma.proposal.groupBy({
      by: ['stage'],
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: { gte: currentFrom },
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
        createdAt: { gte: currentFrom },
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
    prisma.$queryRaw<readonly MonthlyTrendRow[]>`
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
}

async function fetchComparisonData(orgId: string, ranges: DateRange) {
  const { currentFrom, previousFrom, previousTo, now } = ranges
  return Promise.all([
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
}

type ComparisonData = Awaited<ReturnType<typeof fetchComparisonData>>

function buildComparisonMetrics(data: ComparisonData) {
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
  ] = data

  const currentPendingCents =
    currentPendingCommissions._sum.commissionValueInCents ?? 0
  const previousPendingCents =
    previousPendingCommissions._sum.commissionValueInCents ?? 0
  const currentPremiumCents = currentPremium._sum.premiumValueInCents ?? 0
  const previousPremiumCents = previousPremium._sum.premiumValueInCents ?? 0
  const currentTicket =
    currentPremium._count > 0
      ? Math.round(currentPremiumCents / currentPremium._count)
      : 0
  const previousTicket =
    previousPremium._count > 0
      ? Math.round(previousPremiumCents / previousPremium._count)
      : 0

  return {
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
        changePercent: calculateChangePercent(currentClaims, previousClaims),
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
      changePercent: calculateChangePercent(currentTicket, previousTicket),
    },
    commissionsReceivable:
      commissionsReceivable._sum.commissionValueInCents ?? 0,
  }
}

export async function buildDashboardData(
  orgId: string,
  preset: DashboardPreset
): Promise<DashboardData> {
  const ranges = buildDateRanges(preset)

  const [chartResults, comparisonData] = await Promise.all([
    fetchChartData(orgId, ranges),
    fetchComparisonData(orgId, ranges),
  ])

  const [
    proposalsByStage,
    activePolicies,
    expiringPolicies,
    claimsByPriority,
    commissionsThisMonth,
    conversionRate,
    monthlyTrends,
  ] = chartResults

  return {
    proposalsByStage,
    activePolicies,
    expiringPolicies,
    claimsByPriority,
    commissionsThisMonth,
    conversionRate,
    monthlyTrends,
    ...buildComparisonMetrics(comparisonData),
  }
}
