import {
  CountUnreadNotifications,
  ListNotifications,
  MarkAllNotificationsAsRead,
  MarkNotificationAsRead,
  PrismaNotificationRepository,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../../schemas/notification.schemas.js'

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  const repo = new PrismaNotificationRepository(prisma)
  const listNotifications = new ListNotifications(repo)
  const markAsRead = new MarkNotificationAsRead(repo)
  const markAllAsRead = new MarkAllNotificationsAsRead(repo)
  const countUnread = new CountUnreadNotifications(repo)

  // GET /api/v1/notifications
  app.get(
    '/api/v1/notifications',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { read, cursor, limit } = listNotificationsQuerySchema.parse(
        request.query
      )
      const orgId = request.organizationId!
      const userId = request.user!.id

      const result = await listNotifications.execute({
        organizationId: orgId,
        userId,
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
      const orgId = request.organizationId!
      const userId = request.user!.id
      const result = await countUnread.execute(orgId, userId)
      return reply.send({ success: true, data: result })
    }
  )

  // POST /api/v1/notifications/:id/read
  app.post(
    '/api/v1/notifications/:id/read',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = notificationIdParamSchema.parse(request.params)
      const orgId = request.organizationId!
      const userId = request.user!.id
      await markAsRead.execute(id, orgId, userId)
      return reply.send({ success: true, data: null })
    }
  )

  // POST /api/v1/notifications/read-all
  app.post(
    '/api/v1/notifications/read-all',
    { preHandler: [requireAbility('read', 'Notification')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const orgId = request.organizationId!
      const userId = request.user!.id
      const result = await markAllAsRead.execute(orgId, userId)
      return reply.send({ success: true, data: result })
    }
  )
}
