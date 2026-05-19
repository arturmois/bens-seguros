import { container, GetInsurer } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema, insurerDetailResponse } from './_schemas.js'

export function getInsurerRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/insurers/:id',
    schema: {
      operationId: 'getInsurer',
      tags: ['Insurers'],
      summary: 'Get an insurer by id',
      params: idParamSchema,
      response: { 200: insurerDetailResponse },
    },
    preHandler: [requireAbility('read', 'Insurer')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetInsurer)
      try {
        const insurer = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({ success: true, data: insurer })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
