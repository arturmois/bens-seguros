import { container, ListDocuments } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listDocumentsQuerySchema, documentListResponse } from './_schemas.js'

export function listDocumentsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/documents',
    schema: {
      operationId: 'listDocuments',
      tags: ['Documents'],
      summary: 'List documents for a given entity',
      querystring: listDocumentsQuerySchema,
      response: { 200: documentListResponse },
    },
    preHandler: [requireAbility('read', 'Document')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListDocuments)
      const documents = await useCase.execute(
        request.query.entityType,
        request.query.entityId,
        request.organizationId!
      )
      return reply.send({ success: true, data: documents })
    },
  })
}
