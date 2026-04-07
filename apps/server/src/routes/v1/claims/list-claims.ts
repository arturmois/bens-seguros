import { ListClaims, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { claimListResponse, listClaimsQuerySchema } from './_schemas.js'

export function listClaimsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/claims',
    schema: {
      tags: ['Claims'],
      summary: 'List claims with pagination and filters',
      operationId: 'listClaims',
      querystring: listClaimsQuerySchema,
      response: { 200: claimListResponse },
    },
    preHandler: [requireAbility('read', 'Claim')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListClaims)
      const { limit, cursor, ...filters } = request.query
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
