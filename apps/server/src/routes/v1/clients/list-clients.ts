import { container, ListClients } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { clientListResponse, listClientsQuerySchema } from './_schemas.js'

export function listClientsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/clients',
    schema: {
      tags: ['Clients'],
      summary: 'List clients with cursor pagination',
      operationId: 'listClients',
      querystring: listClientsQuerySchema,
      response: { 200: clientListResponse },
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListClients)
      const {
        limit,
        cursor,
        sortBy,
        sortOrder,
        hasActivePolicy,
        personTypeIn,
        search,
      } = request.query
      const result = await useCase.execute({
        organizationId: request.organizationId!,
        hasActivePolicy,
        personTypeIn,
        search,
        cursor,
        limit,
        sortBy,
        sortOrder,
      })
      return reply.send({
        success: true,
        data: result.items,
        meta: { nextCursor: result.nextCursor },
      })
    },
  })
}
