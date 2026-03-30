import { container, CreateClient, ClientPresenter } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { auditCreate } from '../../../services/audit-logger.js'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { createClientBodySchema } from './_schemas.js'
import { handleDomainError } from '../handle-domain-error.js'

export function createClientRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/clients',
    schema: {
      tags: ['Clients'],
      summary: 'Create a new client',
      operationId: 'createClient',
      body: createClientBodySchema,
    },
    preHandler: [requireAbility('create', 'Client')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateClient)
      try {
        const client = await useCase.execute({
          organizationId: request.organizationId!,
          ...request.body,
          salespersonId:
            request.role === 'COMMERCIAL' ? request.user!.id : null,
        })
        auditCreate({
          request,
          entityType: 'Client',
          entityId: client.id,
          after: client,
        })
        return reply.status(201).send({
          success: true,
          data: ClientPresenter.toDetail(client, {
            role: request.role!,
            userId: request.user!.id,
          }),
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
