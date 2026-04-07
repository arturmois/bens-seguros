import { CreateOccurrence, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  createOccurrenceBodySchema,
  idParamSchema,
  occurrenceResponse,
} from './_schemas.js'

export function createOccurrenceRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/claims/:id/occurrences',
    schema: {
      tags: ['Claims'],
      summary: 'Create an occurrence for a claim',
      operationId: 'createClaimOccurrence',
      params: idParamSchema,
      body: createOccurrenceBodySchema,
      response: { 201: occurrenceResponse },
    },
    preHandler: [requireAbility('update', 'Claim')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateOccurrence)
      try {
        const occurrence = await useCase.execute({
          claimId: request.params.id,
          organizationId: request.organizationId!,
          createdBy: request.user!.id,
          ...request.body,
        })
        return reply.status(201).send({ success: true, data: occurrence })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
