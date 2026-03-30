import { DeleteClaim, container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditDelete } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema } from './_schemas.js'

export function deleteClaimRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/api/v1/claims/:id',
    schema: {
      tags: ['Claims'],
      summary: 'Soft-delete a claim',
      operationId: 'deleteClaim',
      params: idParamSchema,
    },
    preHandler: [requireAbility('delete', 'Claim')],
    handler: async (request, reply) => {
      const useCase = container.resolve(DeleteClaim)
      try {
        await useCase.execute(request.params.id, request.organizationId!)
        auditDelete({
          request,
          entityType: 'Claim',
          entityId: request.params.id,
        })
        return reply.status(204).send()
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
