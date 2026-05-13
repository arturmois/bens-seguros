import { container, UpdateProposalObservations } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  errorResponse,
  idParam,
  proposalDetailResponse,
  updateProposalObservationsBody,
} from './_schemas.js'

export function updateProposalObservationsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/api/v1/proposals/:id/observations',
    schema: {
      tags: ['Proposals'],
      summary: 'Update proposal observations',
      operationId: 'updateProposalObservations',
      params: idParam,
      body: updateProposalObservationsBody,
      response: {
        200: proposalDetailResponse,
        404: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateProposalObservations)
      try {
        const updated = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body.observations
        )
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: request.params.id,
          after: { observations: updated.observations },
        })
        return reply.send({ success: true, data: updated.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
