import type { ClientsApi } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { clientCreateResponse, createClientBodySchema } from './_schemas.js'

export function createClientRoute(app: FastifyInstance, clients: ClientsApi) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/clients',
    schema: {
      tags: ['Clients'],
      summary: 'Create a client (fiscal data)',
      operationId: 'createClient',
      body: createClientBodySchema,
      response: { 201: clientCreateResponse },
    },
    preHandler: [requireAbility('create', 'Client')],
    handler: async (request, reply) => {
      try {
        const created = await clients.createClient.execute({
          organizationId: request.organizationId!,
          ...request.body,
        })
        auditCreate({
          request,
          entityType: 'Client',
          entityId: created.id,
          after: created,
        })
        return reply.code(201).send({ success: true, data: created })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
