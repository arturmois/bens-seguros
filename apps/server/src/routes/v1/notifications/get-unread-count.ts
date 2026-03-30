import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { container, CountUnreadNotifications } from '@repo/core'
import { requireAbility } from '../../../middlewares/ability-middleware.js'

export function getUnreadCountRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/notifications/unread-count',
    schema: {
      operationId: 'getUnreadCount',
      tags: ['Notifications'],
      summary: 'Get unread notification count',
    },
    preHandler: [requireAbility('read', 'Notification')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CountUnreadNotifications)
      const result = await useCase.execute(
        request.organizationId!,
        request.user!.id
      )
      return reply.send({ success: true, data: result })
    },
  })
}
