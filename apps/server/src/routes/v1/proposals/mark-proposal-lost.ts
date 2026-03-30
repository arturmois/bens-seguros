import { container, MarkProposalLost } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  idParam,
  markLostBody,
  proposalDetailResponse,
  errorResponse,
} from './_schemas.js'

export function markProposalLostRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/proposals/:id/lost',
    schema: {
      tags: ['Proposals'],
      summary: 'Mark proposal as lost',
      operationId: 'markProposalLost',
      params: idParam,
      body: markLostBody,
      response: {
        200: proposalDetailResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(MarkProposalLost)
      try {
        const proposal = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body.reason
        )
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: request.params.id,
          after: { stage: 'LOST' },
        })
        return reply.send({ success: true, data: proposal.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
