import { container, UncompleteChecklistItem } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  checklistItemIdParam,
  checklistItemResponse,
  errorResponse,
} from './_schemas.js'

export function uncompleteChecklistItemRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/api/v1/proposals/:id/checklist/:itemId/complete',
    schema: {
      tags: ['Proposals'],
      summary: 'Unmark a checklist item (revert completion)',
      operationId: 'uncompleteProposalChecklistItem',
      params: checklistItemIdParam,
      response: { 200: checklistItemResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('update', 'Proposal')],
    handler: async (request, reply) => {
      const { id, itemId } = request.params
      const useCase = container.resolve(UncompleteChecklistItem)
      try {
        const item = await useCase.execute(itemId, id, request.organizationId!)
        return reply.send({ success: true, data: item })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
