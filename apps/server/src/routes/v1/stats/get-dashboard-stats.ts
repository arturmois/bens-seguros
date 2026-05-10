import { BuildDashboardSnapshot, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import {
  dashboardStatsQuerySchema,
  dashboardStatsResponse,
} from './_schemas.js'

export function getDashboardStatsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/stats/dashboard',
    schema: {
      operationId: 'getDashboardStats',
      tags: ['Stats'],
      summary: 'Get dashboard statistics',
      querystring: dashboardStatsQuerySchema,
      response: { 200: dashboardStatsResponse },
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (request, reply) => {
      const { preset } = request.query
      const useCase = container.resolve(BuildDashboardSnapshot)
      const data = await useCase.execute(request.organizationId!, preset)
      return reply.send({ success: true, data })
    },
  })
}
