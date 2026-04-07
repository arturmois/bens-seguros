import { container, MarkAllNotificationsAsRead } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { markAllAsReadResponse } from './_schemas.js'

export function markAllAsReadRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/notifications/read-all',
    schema: {
      operationId: 'markAllNotificationsRead',
      tags: ['Notifications'],
      summary: 'Mark all notifications as read',
      response: { 200: markAllAsReadResponse },
    },
    preHandler: [requireAbility('read', 'Notification')],
    handler: async (request, reply) => {
      const useCase = container.resolve(MarkAllNotificationsAsRead)
      const result = await useCase.execute(
        request.organizationId!,
        request.user!.id
      )
      return reply.send({ success: true, data: result })
    },
  })
}
