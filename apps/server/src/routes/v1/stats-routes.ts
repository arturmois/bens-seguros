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
