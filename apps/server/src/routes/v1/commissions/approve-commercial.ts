import { ApproveCommissionCommercial, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditApprove } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { commissionIdParam, commissionDetailResponse } from './_schemas.js'

export async function approveCommercialRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/commissions/:id/approve-commercial',
    schema: {
      tags: ['Commissions'],
      summary: 'Approve commission (commercial step)',
      operationId: 'approveCommissionCommercial',
      params: commissionIdParam,
      response: { 200: commissionDetailResponse },
    },
    preHandler: [requireAbility('approve', 'Commission')],
    async handler(request, reply) {
      const { id } = request.params
      const useCase = container.resolve(ApproveCommissionCommercial)
      try {
        const commission = await useCase.execute(
          id,
          request.organizationId!,
          request.user!.id
        )
        auditApprove({
          request,
          entityType: 'Commission',
          entityId: id,
          after: { status: commission.status },
        })
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
