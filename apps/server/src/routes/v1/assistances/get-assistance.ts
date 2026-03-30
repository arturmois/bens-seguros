import { container, GetAssistance } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema, assistanceDetailResponse } from './_schemas.js'

export function getAssistanceRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/assistances/:id',
    schema: {
      operationId: 'getAssistance',
      tags: ['Assistances'],
      summary: 'Get an assistance request by ID',
      params: idParamSchema,
      response: { 200: assistanceDetailResponse },
    },
    preHandler: [requireAbility('read', 'Assistance')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetAssistance)
      try {
        const assistance = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({ success: true, data: assistance })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
