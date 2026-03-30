import { container, PayCommission } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { commissionIdParam } from './_schemas.js'

export async function payCommissionRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/commissions/:id/pay',
    schema: {
      tags: ['Commissions'],
      summary: 'Mark commission as paid',
      operationId: 'payCommission',
      params: commissionIdParam,
    },
    preHandler: [requireAbility('manage', 'Commission')],
    async handler(request, reply) {
      const { id } = request.params
      const useCase = container.resolve(PayCommission)
      try {
        const commission = await useCase.execute(id, request.organizationId!)
        auditUpdate({
          request,
          entityType: 'Commission',
          entityId: id,
          after: { status: 'PAID' },
        })
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
