import { container, ReopenProposal } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { errorResponse, idParam, proposalNullResponse } from './_schemas.js'

export function reopenProposalRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/proposals/:id/reopen',
    schema: {
      tags: ['Proposals'],
      summary: 'Reopen a lost proposal',
      operationId: 'reopenProposal',
      params: idParam,
      response: {
        200: proposalNullResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      try {
        const useCase = container.resolve(ReopenProposal)
        await useCase.execute(request.params.id, request.organizationId!)
        return reply.send({ success: true, data: null })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
