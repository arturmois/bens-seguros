import { AdvanceProposalStage, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParam } from './_schemas.js'

export function advanceProposalRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/proposals/:id/advance',
    schema: {
      tags: ['Proposals'],
      summary: 'Advance proposal to next stage',
      operationId: 'advanceProposal',
      params: idParam,
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(AdvanceProposalStage)
      try {
        const result = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: request.params.id,
          after: { stage: result.stage },
        })
        return reply.send({ success: true, data: result.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
