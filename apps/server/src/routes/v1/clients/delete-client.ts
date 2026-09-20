import type { ClientsApi } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditDelete } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema } from './_schemas.js'

export function deleteClientRoute(app: FastifyInstance, clients: ClientsApi) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/api/v1/clients/:id',
    schema: {
      tags: ['Clients'],
      summary: 'Soft-delete a client',
      operationId: 'deleteClient',
      params: idParamSchema,
    },
    preHandler: [requireAbility('delete', 'Client')],
    handler: async (request, reply) => {
      try {
        await clients.deleteClient.execute(
          request.params.id,
          request.organizationId!
        )
        auditDelete({
          request,
          entityType: 'Client',
          entityId: request.params.id,
        })
        return reply.status(204).send()
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
