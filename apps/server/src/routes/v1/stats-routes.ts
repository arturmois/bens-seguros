import { prisma } from '@repo/db'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { dashboardStatsQuerySchema } from '../../schemas/stats.schemas.js'

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.get(
    '/api/v1/stats/dashboard',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { months } = dashboardStatsQuerySchema.parse(request.query)
      const orgId = request.organizationId!
      const now = new Date()
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      )
      const cutoffDate = new Date(
        now.getTime() - months * 30 * 24 * 60 * 60 * 1000
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
            createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
            deletedAt: null,
          },
          _sum: { commissionValueInCents: true },
          _count: true,
        }),

        Promise.all([
          prisma.proposal.count({
            where: {
              organizationId: orgId,
              createdAt: { gte: cutoffDate },
              deletedAt: null,
            },
          }),
          prisma.proposal.count({
            where: {
              organizationId: orgId,
              stage: 'POLICY_ISSUED',
              createdAt: { gte: cutoffDate },
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
            AND "createdAt" >= ${cutoffDate}
            AND "deletedAt" IS NULL
          GROUP BY DATE_TRUNC('month', "createdAt")
          ORDER BY month
        `,
      ])

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
        },
      })
    }
  )
}
