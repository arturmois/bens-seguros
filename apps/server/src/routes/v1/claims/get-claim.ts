import { GetClaim, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { claimDetailResponse, idParamSchema } from './_schemas.js'

export function getClaimRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/claims/:id',
    schema: {
      tags: ['Claims'],
      summary: 'Get a claim by ID',
      operationId: 'getClaim',
      params: idParamSchema,
      response: { 200: claimDetailResponse },
    },
    preHandler: [requireAbility('read', 'Claim')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetClaim)
      try {
        const claim = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({ success: true, data: claim })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
