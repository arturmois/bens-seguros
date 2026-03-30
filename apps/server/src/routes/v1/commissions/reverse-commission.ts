import { container, ReverseCommission } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { commissionIdParam, commissionReversalResponse } from './_schemas.js'

export async function reverseCommissionRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/commissions/:id/reverse',
    schema: {
      tags: ['Commissions'],
      summary: 'Reverse commission payment',
      operationId: 'reverseCommission',
      params: commissionIdParam,
      response: { 201: commissionReversalResponse },
    },
    preHandler: [requireAbility('manage', 'Commission')],
    async handler(request, reply) {
      const { id } = request.params
      const useCase = container.resolve(ReverseCommission)
      try {
        const result = await useCase.execute(id, request.organizationId!)
        auditUpdate({
          request,
          entityType: 'Commission',
          entityId: id,
          after: { status: 'REVERSED' },
        })
        return reply.status(201).send({ success: true, data: result })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
