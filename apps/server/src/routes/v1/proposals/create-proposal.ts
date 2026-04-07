import { container, CreateProposal } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  createProposalBody,
  errorResponse,
  proposalDetailResponse,
} from './_schemas.js'

export function createProposalRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/proposals',
    schema: {
      tags: ['Proposals'],
      summary: 'Create a new proposal',
      operationId: 'createProposal',
      body: createProposalBody,
      response: {
        201: proposalDetailResponse,
        400: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('create', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateProposal)
      try {
        const proposal = await useCase.execute({
          organizationId: request.organizationId!,
          salespersonId: request.user!.id,
          ...request.body,
        })
        auditCreate({
          request,
          entityType: 'Proposal',
          entityId: proposal.id,
          after: proposal,
        })
        return reply
          .status(201)
          .send({ success: true, data: proposal.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
