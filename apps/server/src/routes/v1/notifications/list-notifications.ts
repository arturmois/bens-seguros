import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { container, ListNotifications } from '@repo/core'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listNotificationsQuerySchema } from './_schemas.js'

export function listNotificationsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/notifications',
    schema: {
      operationId: 'listNotifications',
      tags: ['Notifications'],
      summary: 'List notifications with cursor pagination',
      querystring: listNotificationsQuerySchema,
    },
    preHandler: [requireAbility('read', 'Notification')],
    handler: async (request, reply) => {
      const { read, cursor, limit } = request.query
      const useCase = container.resolve(ListNotifications)
      const result = await useCase.execute({
        organizationId: request.organizationId!,
        userId: request.user!.id,
        read,
        cursor,
        limit,
      })

      return reply.send({
        success: true,
        data: result.data,
        meta: { nextCursor: result.nextCursor },
      })
    },
  })
}
