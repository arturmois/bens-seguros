import { container, GetEndorsement } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema } from './_schemas.js'

export function getEndorsementRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/endorsements/:id',
    schema: {
      operationId: 'getEndorsement',
      tags: ['Endorsements'],
      summary: 'Get an endorsement by ID',
      params: idParamSchema,
    },
    preHandler: [requireAbility('read', 'Endorsement')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetEndorsement)
      try {
        const endorsement = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({ success: true, data: endorsement })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
