import { container, UploadDocument } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { uploadDocumentQuerySchema } from './_schemas.js'

export function uploadDocumentRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/documents/upload',
    schema: {
      operationId: 'uploadDocument',
      tags: ['Documents'],
      summary: 'Upload a document for an entity',
      querystring: uploadDocumentQuerySchema,
    },
    preHandler: [requireAbility('create', 'Document')],
    handler: async (request, reply) => {
      const file = await request.file()

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'A file is required for upload',
          },
        })
      }

      const buffer = await file.toBuffer()
      const useCase = container.resolve(UploadDocument)

      try {
        const document = await useCase.execute({
          organizationId: request.organizationId!,
          entityType: request.query.entityType,
          entityId: request.query.entityId,
          clientId: request.query.clientId,
          type: request.query.type,
          fileName: file.filename,
          mimeType: file.mimetype,
          buffer,
          createdBy: request.user!.id,
        })
        auditCreate({ request, entityType: 'Document', entityId: document.id })
        return reply.status(201).send({ success: true, data: document })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
