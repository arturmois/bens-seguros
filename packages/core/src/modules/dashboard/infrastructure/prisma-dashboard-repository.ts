import type { PrismaClient, ProposalStage } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import { isGoalBoardType } from '../../goal/domain/goal.js'
import type {
  DashboardRepository,
  PremiumByMonthEntry,
} from '../domain/dashboard-repository.js'
import type {
  DashboardPreset,
  DashboardSnapshot,
  MetricComparison,
  MonthlyTrend,
  ProposalsPendingBuckets,
  SalespersonRanking,
  WarningsStats,
} from '../domain/dashboard-snapshot.js'
import { presetToDays } from '../domain/dashboard-snapshot.js'

interface DateRange {
  readonly currentFrom: Date
  readonly previousFrom: Date
  readonly previousTo: Date
  readonly now: Date
  readonly thirtyDaysFromNow: Date
  readonly sevenDaysFromNow: Date
}

const PENDING_STAGES: readonly ProposalStage[] = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
]

function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

@injectable()
export class PrismaDashboardRepository implements DashboardRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async getSnapshot(
    organizationId: string,
    preset: DashboardPreset
  ): Promise<DashboardSnapshot> {
    const ranges = this.buildDateRanges(preset)
    const [
      chartResults,
      comparisonData,
      ranking,
      newInsurance,
      renewal7dPremiumCents,
      warnings,
      proposalsPending,
    ] = await Promise.all([
      this.fetchChartData(organizationId, ranges),
      this.fetchComparisonData(organizationId, ranges),
      this.fetchRanking(organizationId, ranges.currentFrom),
      this.fetchNewInsuranceStats(organizationId, ranges),
      this.fetchRenewal7dPremium(organizationId, ranges),
      this.fetchWarnings(organizationId),
      this.fetchProposalsPendingByBucket(organizationId, ranges.now),
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
      ...this.buildComparisonMetrics(comparisonData),
    }
  }

  async getPremiumByMonthAndBoardType(
    organizationId: string,
    year: number
  ): Promise<readonly PremiumByMonthEntry[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ month: number; board_type: string; realized_cents: bigint }>
    >`
      SELECT
        EXTRACT(MONTH FROM p."startDate")::int AS month,
        pr."boardType"::text AS board_type,
        COALESCE(SUM(p."premiumValueInCents"), 0)::bigint AS realized_cents
      FROM "Policy" p
      JOIN "Proposal" pr ON pr.id = p."proposalId"
      WHERE p."organizationId" = ${organizationId}
        AND p."deletedAt" IS NULL
        AND pr."boardType" IN ('NEW_INSURANCE', 'RENEWAL')
        AND EXTRACT(YEAR FROM p."startDate") = ${year}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `
    const entries: PremiumByMonthEntry[] = []
    for (const r of rows) {
      if (!isGoalBoardType(r.board_type)) continue
      entries.push({
        month: r.month,
        boardType: r.board_type,
        realizedCents: Number(r.realized_cents),
      })
    }
    return entries
  }

  private buildDateRanges(preset: DashboardPreset): DateRange {
    const now = new Date()
    const days = presetToDays(preset)
    const currentFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousFrom = new Date(
      now.getTime() - 2 * days * 24 * 60 * 60 * 1000
    )
    const previousTo = currentFrom
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return {
      currentFrom,
      previousFrom,
      previousTo,
      now,
      thirtyDaysFromNow,
      sevenDaysFromNow,
    }
  }

  private async fetchChartData(orgId: string, ranges: DateRange) {
    const { currentFrom, thirtyDaysFromNow, sevenDaysFromNow, now } = ranges
    return Promise.all([
      this.prisma.proposal.groupBy({
        by: ['stage'],
        where: {
          organizationId: orgId,
          deletedAt: null,
          createdAt: { gte: currentFrom },
          stage: { notIn: ['POLICY_ISSUED', 'LOST'] },
        },
        _count: true,
      }),
      this.prisma.policy.count({
        where: { organizationId: orgId, status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.policy.count({
        where: {
          organizationId: orgId,
          status: 'ACTIVE',
          endDate: { lte: thirtyDaysFromNow, gte: now },
          deletedAt: null,
        },
      }),
      this.prisma.claim.groupBy({
        by: ['priority'],
        where: {
          organizationId: orgId,
          createdAt: { gte: currentFrom },
          status: { notIn: ['COMPLETED', 'REJECTED'] },
          deletedAt: null,
        },
        _count: true,
      }),
      this.prisma.commission.groupBy({
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
        this.prisma.proposal.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: currentFrom },
            deletedAt: null,
          },
        }),
        this.prisma.proposal.count({
          where: {
            organizationId: orgId,
            stage: 'POLICY_ISSUED',
            updatedAt: { gte: currentFrom },
            deletedAt: null,
            policy: { isNot: null },
          },
        }),
      ]).then(([total, issued]) => ({
        total,
        issued,
        rate: total > 0 ? Math.round((issued / total) * 100) : 0,
      })),
      this.prisma.$queryRaw<readonly MonthlyTrend[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'YYYY-MM') as month,
          COUNT(*) FILTER (WHERE p."stage" != 'LOST')::int as proposals,
          COUNT(*) FILTER (WHERE pol."id" IS NOT NULL)::int as issued
        FROM "Proposal" p
        LEFT JOIN "Policy" pol ON pol."proposalId" = p."id" AND pol."deletedAt" IS NULL
        WHERE p."organizationId" = ${orgId}
          AND p."createdAt" >= ${currentFrom}
          AND p."deletedAt" IS NULL
        GROUP BY DATE_TRUNC('month', p."createdAt")
        ORDER BY month
      `,
      this.prisma.policy.count({
        where: {
          organizationId: orgId,
          status: 'ACTIVE',
          endDate: { lte: sevenDaysFromNow, gte: now },
          deletedAt: null,
        },
      }),
    ])
  }

  private async fetchComparisonData(orgId: string, ranges: DateRange) {
    const { currentFrom, previousFrom, previousTo, now } = ranges
    return Promise.all([
      this.prisma.proposal.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: currentFrom, lte: now },
          deletedAt: null,
        },
      }),
      this.prisma.proposal.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: previousFrom, lt: previousTo },
          deletedAt: null,
        },
      }),
      this.prisma.policy.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: currentFrom, lte: now },
          deletedAt: null,
        },
      }),
      this.prisma.policy.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: previousFrom, lt: previousTo },
          deletedAt: null,
        },
      }),
      this.prisma.claim.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: currentFrom, lte: now },
          deletedAt: null,
        },
      }),
      this.prisma.claim.count({
        where: {
          organizationId: orgId,
          createdAt: { gte: previousFrom, lt: previousTo },
          deletedAt: null,
        },
      }),
      this.prisma.commission.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING_COMMERCIAL', 'PENDING_ADMIN'] },
          createdAt: { gte: currentFrom, lte: now },
          deletedAt: null,
        },
        _sum: { commissionValueInCents: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING_COMMERCIAL', 'PENDING_ADMIN'] },
          createdAt: { gte: previousFrom, lt: previousTo },
          deletedAt: null,
        },
        _sum: { commissionValueInCents: true },
      }),
      this.prisma.policy.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: currentFrom, lte: now },
          deletedAt: null,
        },
        _sum: { premiumValueInCents: true },
        _count: true,
      }),
      this.prisma.policy.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: previousFrom, lt: previousTo },
          deletedAt: null,
        },
        _sum: { premiumValueInCents: true },
        _count: true,
      }),
      this.prisma.commission.aggregate({
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

  private async fetchNewInsuranceStats(
    orgId: string,
    ranges: DateRange
  ): Promise<MetricComparison> {
    const [current, previous] = await Promise.all([
      this.prisma.policy.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          createdAt: { gte: ranges.currentFrom, lte: ranges.now },
          proposal: { boardType: 'NEW_INSURANCE' },
        },
      }),
      this.prisma.policy.count({
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

  private async fetchRenewal7dPremium(
    orgId: string,
    ranges: DateRange
  ): Promise<number> {
    const result = await this.prisma.policy.aggregate({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { lte: ranges.sevenDaysFromNow, gte: ranges.now },
      },
      _sum: { premiumValueInCents: true },
    })
    return result._sum.premiumValueInCents ?? 0
  }

  private async fetchWarnings(orgId: string): Promise<WarningsStats> {
    const [claimsOpen, assistancesOpen] = await Promise.all([
      this.prisma.claim.count({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'REJECTED'] },
        },
      }),
      this.prisma.assistance.count({
        where: { organizationId: orgId, status: { not: 'COMPLETED' } },
      }),
    ])
    return { total: claimsOpen + assistancesOpen, claimsOpen, assistancesOpen }
  }

  private async fetchProposalsPendingByBucket(
    orgId: string,
    now: Date
  ): Promise<ProposalsPendingBuckets> {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const baseWhere = {
      organizationId: orgId,
      deletedAt: null,
      stage: { in: [...PENDING_STAGES] },
    }
    const [inDay, warning, critical] = await Promise.all([
      this.prisma.proposal.count({
        where: { ...baseWhere, updatedAt: { gte: threeDaysAgo } },
      }),
      this.prisma.proposal.count({
        where: {
          ...baseWhere,
          updatedAt: { gte: sevenDaysAgo, lt: threeDaysAgo },
        },
      }),
      this.prisma.proposal.count({
        where: { ...baseWhere, updatedAt: { lt: sevenDaysAgo } },
      }),
    ])
    return { total: inDay + warning + critical, inDay, warning, critical }
  }

  private async fetchRanking(
    orgId: string,
    currentFrom: Date
  ): Promise<readonly SalespersonRanking[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        salespersonId: string
        salespersonName: string
        policiesIssued: number
        totalPremiumCents: bigint
      }>
    >`
      SELECT
        p."salespersonId",
        COALESCE(u."name", 'Desconhecido') as "salespersonName",
        COUNT(*)::int as "policiesIssued",
        COALESCE(SUM(p."premiumValueInCents"), 0) as "totalPremiumCents"
      FROM "Policy" p
      LEFT JOIN "Member" m ON m."userId" = p."salespersonId" AND m."organizationId" = p."organizationId"
      LEFT JOIN "User" u ON u."id" = m."userId"
      WHERE p."organizationId" = ${orgId}
        AND p."createdAt" >= ${currentFrom}
        AND p."deletedAt" IS NULL
      GROUP BY p."salespersonId", u."name"
      ORDER BY COALESCE(SUM(p."premiumValueInCents"), 0) DESC
      LIMIT 10
    `
    return results.map((r) => ({
      salespersonId: r.salespersonId,
      salespersonName: r.salespersonName,
      policiesIssued: r.policiesIssued,
      totalPremiumCents: Number(r.totalPremiumCents),
      averageTicketCents:
        r.policiesIssued > 0
          ? Math.round(Number(r.totalPremiumCents) / r.policiesIssued)
          : 0,
    }))
  }

  private buildComparisonMetrics(
    data: Awaited<ReturnType<PrismaDashboardRepository['fetchComparisonData']>>
  ): {
    comparison: {
      proposals: MetricComparison
      policies: MetricComparison
      claims: MetricComparison
      commissionsPending: MetricComparison
    }
    totalPremium: MetricComparison
    averageTicket: MetricComparison
    commissionsReceivable: number
  } {
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
}
