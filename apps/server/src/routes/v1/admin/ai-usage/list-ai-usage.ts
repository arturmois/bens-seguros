import { container, ListAiUsageRecords } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { listAiUsageQuerySchema, listAiUsageResponse } from './_schemas.js'

export function listAiUsageRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/admin/ai-usage',
    schema: {
      operationId: 'adminListAiUsage',
      tags: ['Admin'],
      summary: 'List AI usage records for an organization (super-admin only)',
      querystring: listAiUsageQuerySchema,
      response: { 200: listAiUsageResponse },
    },
    handler: async (request, reply) => {
      const { organizationId, periodKey, cursor, limit } = request.query
      const useCase = container.resolve(ListAiUsageRecords)
      const result = await useCase.execute(
        { organizationId, periodKey },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: [...result.items],
        meta: { nextCursor: result.nextCursor },
      })
    },
  })
}
