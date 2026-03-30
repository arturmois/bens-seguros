import { container, GetDocumentUrl } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema } from './_schemas.js'

export function getDocumentUrlRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/documents/:id/url',
    schema: {
      operationId: 'getDocumentUrl',
      tags: ['Documents'],
      summary: 'Get a signed URL for a document',
      params: idParamSchema,
    },
    preHandler: [requireAbility('read', 'Document')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetDocumentUrl)
      try {
        const url = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({ success: true, data: { url } })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
