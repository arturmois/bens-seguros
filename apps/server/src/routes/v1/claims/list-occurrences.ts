import { ListOccurrences, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { idParamSchema, occurrenceListResponse } from './_schemas.js'

export function listOccurrencesRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/claims/:id/occurrences',
    schema: {
      tags: ['Claims'],
      summary: 'List occurrences for a claim',
      operationId: 'listClaimOccurrences',
      params: idParamSchema,
      response: { 200: occurrenceListResponse },
    },
    preHandler: [requireAbility('read', 'Claim')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListOccurrences)
      const occurrences = await useCase.execute(
        request.params.id,
        request.organizationId!
      )
      return reply.send({ success: true, data: occurrences })
    },
  })
}
