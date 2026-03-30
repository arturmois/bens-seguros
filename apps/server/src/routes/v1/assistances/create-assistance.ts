import { container, CreateAssistance } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { createAssistanceBodySchema } from './_schemas.js'

export function createAssistanceRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/assistances',
    schema: {
      operationId: 'createAssistance',
      tags: ['Assistances'],
      summary: 'Create a new assistance request',
      body: createAssistanceBodySchema,
    },
    preHandler: [requireAbility('create', 'Assistance')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateAssistance)
      try {
        const assistance = await useCase.execute({
          organizationId: request.organizationId!,
          ...request.body,
        })
        auditCreate({
          request,
          entityType: 'Assistance',
          entityId: assistance.id,
        })
        return reply.status(201).send({ success: true, data: assistance })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
