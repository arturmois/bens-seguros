import { container, CreateClaim } from '@repo/core'
import { env } from '@repo/env'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { claimDetailResponse, createClaimBodySchema } from './_schemas.js'

export function createClaimRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/claims',
    schema: {
      tags: ['Claims'],
      summary: 'Create a new claim',
      operationId: 'createClaim',
      body: createClaimBodySchema,
      response: { 201: claimDetailResponse },
    },
    preHandler: [requireAbility('create', 'Claim')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateClaim)
      try {
        const claim = await useCase.execute(
          {
            organizationId: request.organizationId!,
            ...request.body,
          },
          {
            creatorUserId: request.user!.id,
            frontendUrl: env.FRONTEND_URL,
          }
        )
        auditCreate({
          request,
          entityType: 'Claim',
          entityId: claim.id,
          after: claim,
        })
        return reply.status(201).send({ success: true, data: claim })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
