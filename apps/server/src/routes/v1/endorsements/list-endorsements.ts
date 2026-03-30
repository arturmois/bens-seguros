import { container, ListEndorsements } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listEndorsementsQuerySchema } from './_schemas.js'

export function listEndorsementsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/endorsements',
    schema: {
      operationId: 'listEndorsements',
      tags: ['Endorsements'],
      summary: 'List endorsements with pagination',
      querystring: listEndorsementsQuerySchema,
    },
    preHandler: [requireAbility('read', 'Endorsement')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListEndorsements)
      const { limit, cursor, ...filters } = request.query
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items,
        meta: { nextCursor: result.nextCursor },
      })
    },
  })
}
