import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { dashboardStatsQuerySchema } from '../../schemas/stats.schemas.js'
import { buildDashboardData } from './stats-helpers.js'

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.get(
    '/api/v1/stats/dashboard',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { preset } = dashboardStatsQuerySchema.parse(request.query)
      const orgId = request.organizationId!

      const data = await buildDashboardData(orgId, preset)

      return reply.send({ success: true, data })
    }
  )
}
