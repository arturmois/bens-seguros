import { container, DeleteDocument } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditDelete } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema } from './_schemas.js'

export function deleteDocumentRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/api/v1/documents/:id',
    schema: {
      operationId: 'deleteDocument',
      tags: ['Documents'],
      summary: 'Delete a document by ID',
      params: idParamSchema,
    },
    preHandler: [requireAbility('delete', 'Document')],
    handler: async (request, reply) => {
      const useCase = container.resolve(DeleteDocument)
      try {
        await useCase.execute(request.params.id, request.organizationId!)
        auditDelete({
          request,
          entityType: 'Document',
          entityId: request.params.id,
        })
        return reply.status(204).send()
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
