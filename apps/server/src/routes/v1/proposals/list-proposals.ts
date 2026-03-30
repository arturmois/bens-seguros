import { container, ListProposals } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listProposalsQuery, proposalListResponse } from './_schemas.js'

export function listProposalsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/proposals',
    schema: {
      tags: ['Proposals'],
      summary: 'List proposals with cursor pagination',
      operationId: 'listProposals',
      querystring: listProposalsQuery,
      response: { 200: proposalListResponse },
    },
    preHandler: [requireAbility('read', 'Proposal')],
    handler: async (request, reply) => {
      const { limit, cursor, ...filters } = request.query
      const useCase = container.resolve(ListProposals)
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items.map((p) => p.toJSON()),
        meta: { nextCursor: result.nextCursor },
      })
    },
  })
}
