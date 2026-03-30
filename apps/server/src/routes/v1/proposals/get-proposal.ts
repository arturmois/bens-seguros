import { container, GetProposal } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParam } from './_schemas.js'

export function getProposalRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/proposals/:id',
    schema: {
      tags: ['Proposals'],
      summary: 'Get a proposal by ID',
      operationId: 'getProposal',
      params: idParam,
    },
    preHandler: [requireAbility('read', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetProposal)
      try {
        const proposal = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({ success: true, data: proposal.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
