import { container, type CacheService } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import {
  dashboardStatsQuerySchema,
  dashboardStatsResponse,
} from './_schemas.js'
import { buildDashboardData, type DashboardData } from './stats-helpers.js'

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
      const orgId = request.organizationId!
      const cache = container.resolve<CacheService>('CacheService')
      const cacheKey = `dashboard:stats:${orgId}:${preset}`
      const cached = await cache.get<DashboardData>(cacheKey)
      if (cached) {
        return reply.send({ success: true, data: cached })
      }
      const data = await buildDashboardData(orgId, preset)
      await cache.set(cacheKey, data, 60)
      return reply.send({ success: true, data })
    },
  })
}
