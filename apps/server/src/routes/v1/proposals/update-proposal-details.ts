import { container, UpdateProposalDetails } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParam, updateProposalDetailsBody } from './_schemas.js'

export function updateProposalDetailsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/proposals/:id/details',
    schema: {
      tags: ['Proposals'],
      summary: 'Update proposal insured object details',
      operationId: 'updateProposalDetails',
      params: idParam,
      body: updateProposalDetailsBody,
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateProposalDetails)
      try {
        const updated = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body
        )
        auditUpdate({
          request,
          entityType: 'Proposal',
          entityId: request.params.id,
          after: updated,
        })
        return reply.send({ success: true, data: updated.toJSON() })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
