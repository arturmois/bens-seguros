import type { Prisma } from '@repo/db'
import { prismaAdmin as prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditLogListResponse, listAuditLogsQuerySchema } from './_schemas.js'

export function listAuditLogsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/audit-logs',
    schema: {
      operationId: 'listAuditLogs',
      tags: ['Audit Logs'],
      summary: 'List audit logs with cursor pagination',
      querystring: listAuditLogsQuerySchema,
      response: { 200: auditLogListResponse },
    },
    preHandler: [requireAbility('read', 'AuditLog')],
    handler: async (request, reply) => {
      const {
        entityType,
        entityTypeIn,
        action,
        actionIn,
        userId,
        dateFrom,
        dateTo,
        cursor,
        limit,
      } = request.query
      const orgId = request.organizationId!
      const where: Prisma.AuditLogWhereInput = {
        organizationId: orgId,
        ...(entityTypeIn?.length
          ? { entityType: { in: [...entityTypeIn] } }
          : entityType && { entityType }),
        ...(actionIn?.length
          ? { action: { in: [...actionIn] } }
          : action && { action }),
        ...(userId ? { userId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      }
      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
        prisma.auditLog.count({ where }),
      ])
      const hasMore = items.length > limit
      if (hasMore) items.pop()
      const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null
      return reply.send({
        success: true,
        data: items,
        meta: { total, nextCursor },
      })
    },
  })
}
