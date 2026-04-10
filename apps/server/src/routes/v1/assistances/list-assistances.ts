import { container, ListAssistances } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import {
  assistanceListResponse,
  listAssistancesQuerySchema,
} from './_schemas.js'

export function listAssistancesRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/assistances',
    schema: {
      operationId: 'listAssistances',
      tags: ['Assistances'],
      summary: 'List assistance requests with pagination and filters',
      querystring: listAssistancesQuerySchema,
      response: { 200: assistanceListResponse },
    },
    preHandler: [requireAbility('read', 'Assistance')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListAssistances)
      const { limit, cursor, sortBy, sortOrder, ...filters } = request.query
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor, sortBy, sortOrder }
      )
      return reply.send({
        success: true,
        data: result.items,
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    },
  })
}
