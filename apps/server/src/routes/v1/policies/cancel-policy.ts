import { CancelPolicy, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { cancelPolicyBody, idParam, policyDetailResponse } from './_schemas.js'

export function cancelPolicyRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/policies/:id/cancel',
    schema: {
      tags: ['Policies'],
      summary: 'Cancel an active policy',
      operationId: 'cancelPolicy',
      params: idParam,
      body: cancelPolicyBody,
      response: { 200: policyDetailResponse },
    },
    preHandler: [requireAbility('delete', 'Policy')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CancelPolicy)
      try {
        const policy = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body.reason
        )
        auditUpdate({
          request,
          entityType: 'Policy',
          entityId: request.params.id,
          after: { status: 'CANCELLED' },
        })
        return reply.send({ success: true, data: policy })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
