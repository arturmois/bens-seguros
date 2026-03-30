import { container, ListClients, ClientPresenter } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listClientsQuerySchema } from './_schemas.js'

export function listClientsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/clients',
    schema: {
      tags: ['Clients'],
      summary: 'List clients with cursor pagination',
      operationId: 'listClients',
      querystring: listClientsQuerySchema,
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListClients)
      const { limit, cursor, ...filters } = request.query
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items.map((c) => ClientPresenter.toList(c)),
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    },
  })
}
