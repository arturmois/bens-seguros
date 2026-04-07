import { container, ListCommissions } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { commissionListResponse, listCommissionsQuery } from './_schemas.js'

export async function listCommissionsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/commissions',
    schema: {
      tags: ['Commissions'],
      summary: 'List commissions with filters',
      operationId: 'listCommissions',
      querystring: listCommissionsQuery,
      response: { 200: commissionListResponse },
    },
    preHandler: [requireAbility('read', 'Commission')],
    async handler(request, reply) {
      const { limit, cursor, ...filters } = request.query
      const useCase = container.resolve(ListCommissions)
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
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
