import { container, GetCommission } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { commissionIdParam, commissionDetailResponse } from './_schemas.js'

export async function getCommissionRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/commissions/:id',
    schema: {
      tags: ['Commissions'],
      summary: 'Get commission by ID',
      operationId: 'getCommission',
      params: commissionIdParam,
      response: { 200: commissionDetailResponse },
    },
    preHandler: [requireAbility('read', 'Commission')],
    async handler(request, reply) {
      const { id } = request.params
      const useCase = container.resolve(GetCommission)
      try {
        const commission = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
