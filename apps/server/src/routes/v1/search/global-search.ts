import { container, GlobalSearch } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { globalSearchResponse, searchQuerySchema } from './_schemas.js'

export function globalSearchRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/search',
    schema: {
      operationId: 'globalSearch',
      tags: ['Search'],
      summary: 'Global search across clients, proposals, policies and claims',
      querystring: searchQuerySchema,
      response: { 200: globalSearchResponse },
    },
    preHandler: [requireAbility('read', 'all')],
    handler: async (request, reply) => {
      const { q, limit } = request.query
      const useCase = container.resolve(GlobalSearch)
      const result = await useCase.execute(request.organizationId!, q, limit)
      const totalResults =
        result.clients.length +
        result.proposals.length +
        result.policies.length +
        result.claims.length
      return reply.send({
        success: true,
        data: {
          clients: result.clients.map((c) => ({
            id: c.id,
            name: c.name,
            document: c.document,
            type: 'CLIENT',
          })),
          proposals: result.proposals,
          policies: result.policies,
          claims: result.claims,
        },
        meta: { query: q, totalResults },
      })
    },
  })
}
