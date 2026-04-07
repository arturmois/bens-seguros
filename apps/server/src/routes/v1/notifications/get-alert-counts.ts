import { container, CountAlertsByEntityType } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { alertCountsResponse } from './_schemas.js'

export function getAlertCountsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/notifications/alert-counts',
    schema: {
      operationId: 'getAlertCounts',
      tags: ['Notifications'],
      summary: 'Get alert counts grouped by entity type',
      response: { 200: alertCountsResponse },
    },
    preHandler: [requireAbility('read', 'Notification')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CountAlertsByEntityType)
      const result = await useCase.execute(
        request.organizationId!,
        request.user!.id
      )
      return reply.send({ success: true, data: result })
    },
  })
}
