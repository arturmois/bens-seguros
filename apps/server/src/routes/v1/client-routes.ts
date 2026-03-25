import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  CreateClient,
  ExportClientsCsv,
  ParseClientImport,
  CsvImportError,
  MAX_IMPORT_FILE_SIZE,
  ListClients,
  GetClient,
  UpdateClient,
  DeleteClient,
  ClientAlreadyExistsError,
  ClientNotFoundError,
} from '@repo/core'
import {
  auditCreate,
  auditUpdate,
  auditDelete,
} from '../../services/audit-logger.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  createClientBodySchema,
  updateClientBodySchema,
  listClientsQuerySchema,
  idParamSchema,
} from '../../schemas/client.schemas.js'
import { importJobIdParamSchema } from '../../schemas/import.schemas.js'
import {
  stageImportData,
  retrieveStagedData,
  removeStagedData,
  enqueueImportJob,
  getImportJobStatus,
} from '../../services/csv-import-enqueuer.js'

function handleClientError(error: unknown, reply: FastifyReply) {
  if (error instanceof ClientNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof ClientAlreadyExistsError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/clients',
    { preHandler: [requireAbility('create', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createClientBodySchema.parse(request.body)
      const useCase = container.resolve(CreateClient)
      try {
        const client = await useCase.execute({
          organizationId: request.organizationId!,
          ...body,
        })
        auditCreate({
          request,
          entityType: 'Client',
          entityId: client.id,
          after: client,
        })
        return reply.status(201).send({ success: true, data: client })
      } catch (error) {
        return handleClientError(error, reply)
      }
    }
  )

  // IMPORTANT: export route must be registered BEFORE /:id to avoid route conflict
  app.get(
    '/api/v1/clients/export',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type, search } = listClientsQuerySchema.parse(request.query)
      const useCase = container.resolve(ExportClientsCsv)
      const csv = await useCase.execute({
        organizationId: request.organizationId!,
        type,
        search,
      })
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="clientes.csv"')
        .send(csv)
    }
  )

  // --- Import routes (must be before /:id) ---

  app.get(
    '/api/v1/clients/import/template',
    { preHandler: [requireAbility('read', 'Client')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const template =
        '\uFEFFNome,CPF/CNPJ,Tipo,Email,Telefone,Data Nascimento,Profissao,Estado Civil,Tags\n' +
        'Joao Silva,12345678901,CLIENT,joao@email.com,11999999999,1990-01-15,Engenheiro,MARRIED,vip;indicacao\n'
      return reply
        .header('Content-Type', 'text/csv')
        .header(
          'Content-Disposition',
          'attachment; filename="modelo-clientes.csv"'
        )
        .send(template)
    }
  )

  app.post(
    '/api/v1/clients/import',
    { preHandler: [requireAbility('manage', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const file = await request.file()
      if (!file) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_FILE', message: 'Nenhum arquivo enviado' },
        })
      }

      if (!file.filename.endsWith('.csv')) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Apenas arquivos CSV sao aceitos',
          },
        })
      }

      const buffer = await file.toBuffer()
      if (buffer.length > MAX_IMPORT_FILE_SIZE) {
        return reply.status(413).send({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Arquivo excede o limite de 5MB',
          },
        })
      }

      const csvContent = buffer.toString('utf-8')
      const useCase = container.resolve(ParseClientImport)

      try {
        const result = await useCase.execute(
          csvContent,
          request.organizationId!
        )
        await stageImportData(result.jobId, result.validRows)
        return reply.send({
          success: true,
          data: {
            jobId: result.jobId,
            preview: result.preview,
            validationSummary: result.validationSummary,
          },
        })
      } catch (error) {
        if (error instanceof CsvImportError) {
          return reply.status(422).send({
            success: false,
            error: { code: error.code, message: error.message },
          })
        }
        throw error
      }
    }
  )

  app.post(
    '/api/v1/clients/import/:jobId/confirm',
    { preHandler: [requireAbility('manage', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { jobId } = importJobIdParamSchema.parse(request.params)
      const rows = await retrieveStagedData(jobId)
      if (!rows) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND',
            message:
              'Dados de importacao nao encontrados ou expirados. Faca o upload novamente.',
          },
        })
      }

      await enqueueImportJob(jobId, {
        entityType: 'client',
        organizationId: request.organizationId!,
        userId: request.user!.id,
        rows,
        totalRows: rows.length,
      })

      await removeStagedData(jobId)

      return reply.send({ success: true, data: { jobId } })
    }
  )

  app.get(
    '/api/v1/clients/import/:jobId/status',
    { preHandler: [requireAbility('manage', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { jobId } = importJobIdParamSchema.parse(request.params)
      const { status, progress, result } = await getImportJobStatus(jobId)

      if (status === 'not_found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'JOB_NOT_FOUND', message: 'Job nao encontrado' },
        })
      }

      return reply.send({
        success: true,
        data: {
          status,
          progress: status === 'completed' ? result : progress,
        },
      })
    }
  )

  app.get(
    '/api/v1/clients',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listClientsQuerySchema.parse(request.query)
      const useCase = container.resolve(ListClients)
      const { limit, cursor, ...filters } = query
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items,
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    }
  )

  app.get(
    '/api/v1/clients/:id',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetClient)
      try {
        const client = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: client })
      } catch (error) {
        return handleClientError(error, reply)
      }
    }
  )

  app.put(
    '/api/v1/clients/:id',
    { preHandler: [requireAbility('update', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const body = updateClientBodySchema.parse(request.body)
      const useCase = container.resolve(UpdateClient)
      try {
        const updated = await useCase.execute(id, request.organizationId!, body)
        auditUpdate({
          request,
          entityType: 'Client',
          entityId: id,
          after: updated,
        })
        return reply.send({ success: true, data: updated })
      } catch (error) {
        return handleClientError(error, reply)
      }
    }
  )

  app.delete(
    '/api/v1/clients/:id',
    { preHandler: [requireAbility('delete', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(DeleteClient)
      try {
        await useCase.execute(id, request.organizationId!)
        auditDelete({ request, entityType: 'Client', entityId: id })
        return reply.status(204).send()
      } catch (error) {
        return handleClientError(error, reply)
      }
    }
  )
}
