import { container, ListAuditLogs } from '@repo/core'
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
      const useCase = container.resolve(ListAuditLogs)
      const result = await useCase.execute(
        {
          organizationId: request.organizationId!,
          entityType,
          entityTypeIn,
          action,
          actionIn,
          userId,
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
        },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items,
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    },
  })
}
