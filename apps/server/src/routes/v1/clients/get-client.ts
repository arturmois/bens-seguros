import type { ClientsApi } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { clientDetailResponse, idParamSchema } from './_schemas.js'

export function getClientRoute(app: FastifyInstance, clients: ClientsApi) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/clients/:id',
    schema: {
      tags: ['Clients'],
      summary: 'Get a client by ID with metrics',
      operationId: 'getClient',
      params: idParamSchema,
      response: { 200: clientDetailResponse },
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (request, reply) => {
      try {
        const client = await clients.getClient.execute({
          id: request.params.id,
          organizationId: request.organizationId!,
        })
        return reply.send({ success: true, data: client })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
