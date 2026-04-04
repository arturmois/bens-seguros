import { container, UpdateProposalDates } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  idParam,
  updateProposalDatesBody,
  proposalDetailResponse,
  errorResponse,
} from './_schemas.js'

export function updateProposalDatesRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/api/v1/proposals/:id/dates',
    schema: {
      tags: ['Proposals'],
      summary: 'Update proposal date fields',
      operationId: 'updateProposalDates',
      params: idParam,
      body: updateProposalDatesBody,
      response: {
        200: proposalDetailResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateProposalDates)
      try {
        const updated = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body
        )
        return reply.send({ success: true, data: updated.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
