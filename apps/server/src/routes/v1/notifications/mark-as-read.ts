import { container, MarkNotificationAsRead } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { markAsReadResponse, notificationIdParamSchema } from './_schemas.js'

export function markAsReadRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/notifications/:id/read',
    schema: {
      operationId: 'markNotificationRead',
      tags: ['Notifications'],
      summary: 'Mark a notification as read',
      params: notificationIdParamSchema,
      response: { 200: markAsReadResponse },
    },
    preHandler: [requireAbility('read', 'Notification')],
    handler: async (request, reply) => {
      const { id } = request.params
      const useCase = container.resolve(MarkNotificationAsRead)
      await useCase.execute(id, request.organizationId!, request.user!.id)
      return reply.send({ success: true, data: null })
    },
  })
}
