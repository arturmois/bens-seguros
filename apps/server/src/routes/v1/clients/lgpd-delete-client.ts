import type { ClientsApi } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditDelete } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema } from './_schemas.js'

export function lgpdDeleteClientRoute(
  app: FastifyInstance,
  clients: ClientsApi
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/clients/:id/lgpd-delete',
    schema: {
      tags: ['Clients'],
      summary: 'LGPD data anonymization — irreversible',
      operationId: 'lgpdDeleteClient',
      params: idParamSchema,
    },
    preHandler: [requireAbility('lgpd-delete', 'Client')],
    handler: async (request, reply) => {
      try {
        await clients.lgpdDeleteClient.execute(
          request.params.id,
          request.organizationId!
        )
        auditDelete({
          request,
          entityType: 'Client',
          entityId: request.params.id,
        })
        return reply.status(200).send({
          success: true,
          data: { message: 'Dados do cliente anonimizados conforme LGPD' },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
