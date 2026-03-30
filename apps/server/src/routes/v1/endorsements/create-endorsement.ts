import { container, CreateEndorsement } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  createEndorsementBodySchema,
  endorsementDetailResponse,
} from './_schemas.js'

export function createEndorsementRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/endorsements',
    schema: {
      operationId: 'createEndorsement',
      tags: ['Endorsements'],
      summary: 'Create a new endorsement',
      body: createEndorsementBodySchema,
      response: { 201: endorsementDetailResponse },
    },
    preHandler: [requireAbility('create', 'Endorsement')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateEndorsement)
      try {
        const endorsement = await useCase.execute({
          organizationId: request.organizationId!,
          createdBy: request.user!.id,
          ...request.body,
        })
        auditCreate({
          request,
          entityType: 'Endorsement',
          entityId: endorsement.id,
        })
        return reply.status(201).send({ success: true, data: endorsement })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
