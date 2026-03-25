import {
  CountAlertsByEntityType,
  CountUnreadNotifications,
  ListNotifications,
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
  container,
} from '@repo/core'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../../schemas/notification.schemas.js'

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // GET /api/v1/notifications
  app.get(
    '/api/v1/notifications',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { read, cursor, limit } = listNotificationsQuerySchema.parse(
        request.query
      )
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
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    }
  )

  // GET /api/v1/notifications/unread-count
  app.get(
    '/api/v1/notifications/unread-count',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const useCase = container.resolve(CountUnreadNotifications)
      const result = await useCase.execute(
        request.organizationId!,
        request.user!.id
      )
      return reply.send({ success: true, data: result })
    }
  )

  // GET /api/v1/notifications/alert-counts
  app.get(
    '/api/v1/notifications/alert-counts',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const useCase = container.resolve(CountAlertsByEntityType)
      const result = await useCase.execute(
        request.organizationId!,
        request.user!.id
      )
      return reply.send({ success: true, data: result })
    }
  )

  // POST /api/v1/notifications/:id/read
  app.post(
    '/api/v1/notifications/:id/read',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = notificationIdParamSchema.parse(request.params)
      const useCase = container.resolve(MarkNotificationAsRead)
      await useCase.execute(id, request.organizationId!, request.user!.id)
      return reply.send({ success: true, data: null })
    }
  )

  // POST /api/v1/notifications/read-all
  app.post(
    '/api/v1/notifications/read-all',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const useCase = container.resolve(MarkAllNotificationsAsRead)
      const result = await useCase.execute(
        request.organizationId!,
        request.user!.id
      )
      return reply.send({ success: true, data: result })
    }
  )
}
