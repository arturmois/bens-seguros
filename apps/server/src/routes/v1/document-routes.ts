import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  UploadDocument,
  ListDocuments,
  GetDocumentUrl,
  DeleteDocument,
  DocumentNotFoundError,
  InvalidFileTypeError,
} from '@repo/core'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  uploadDocumentQuerySchema,
  listDocumentsQuerySchema,
} from '../../schemas/document.schemas.js'
import { idParamSchema } from '../../schemas/client.schemas.js'
import { auditCreate, auditDelete } from '../../services/audit-logger.js'

function handleDocumentError(error: unknown, reply: FastifyReply) {
  if (error instanceof DocumentNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof InvalidFileTypeError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/documents/upload',
    { preHandler: [requireAbility('create', 'Document')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = uploadDocumentQuerySchema.parse(request.query)
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
          entityType: query.entityType,
          entityId: query.entityId,
          clientId: query.clientId,
          type: query.type,
          fileName: file.filename,
          mimeType: file.mimetype,
          buffer,
          createdBy: request.user!.id,
        })
        auditCreate({ request, entityType: 'Document', entityId: document.id })
        return reply.status(201).send({ success: true, data: document })
      } catch (error) {
        return handleDocumentError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/documents',
    { preHandler: [requireAbility('read', 'Document')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listDocumentsQuerySchema.parse(request.query)
      const useCase = container.resolve(ListDocuments)
      const documents = await useCase.execute(
        query.entityType,
        query.entityId,
        request.organizationId!
      )
      return reply.send({ success: true, data: documents })
    }
  )

  app.get(
    '/api/v1/documents/:id/url',
    { preHandler: [requireAbility('read', 'Document')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetDocumentUrl)
      try {
        const url = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: { url } })
      } catch (error) {
        return handleDocumentError(error, reply)
      }
    }
  )

  app.delete(
    '/api/v1/documents/:id',
    { preHandler: [requireAbility('delete', 'Document')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(DeleteDocument)
      try {
        await useCase.execute(id, request.organizationId!)
        auditDelete({ request, entityType: 'Document', entityId: id })
        return reply.status(204).send()
      } catch (error) {
        return handleDocumentError(error, reply)
      }
    }
  )
}
