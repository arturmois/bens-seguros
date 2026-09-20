import type { ClientsApi } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  clientUpdateResponse,
  idParamSchema,
  updateClientBodySchema,
} from './_schemas.js'

export function updateClientRoute(app: FastifyInstance, clients: ClientsApi) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/clients/:id',
    schema: {
      tags: ['Clients'],
      summary: 'Update a client (fiscal data only)',
      operationId: 'updateClient',
      params: idParamSchema,
      body: updateClientBodySchema,
      response: { 200: clientUpdateResponse },
    },
    preHandler: [requireAbility('update', 'Client')],
    handler: async (request, reply) => {
      try {
        const updated = await clients.updateClient.execute({
          id: request.params.id,
          organizationId: request.organizationId!,
          ...request.body,
        })
        auditUpdate({
          request,
          entityType: 'Client',
          entityId: request.params.id,
          after: updated,
        })
        return reply.send({ success: true, data: updated })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
