import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  ExportPoliciesCsv,
  ParsePolicyImport,
  CsvImportError,
  MAX_IMPORT_FILE_SIZE,
  IssuePolicy,
  ListPolicies,
  GetPolicy,
  CancelPolicy,
  PolicyNotFoundError,
  PolicyAlreadyCancelledError,
  PolicyNotIssuableError,
} from '@repo/core'
import { ProposalNotFoundError } from '@repo/core'
import { auditCreate, auditUpdate } from '../../services/audit-logger.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  issuePolicyBodySchema,
  listPoliciesQuerySchema,
  cancelPolicyBodySchema,
} from '../../schemas/policy.schemas.js'
import { idParamSchema } from '../../schemas/client.schemas.js'
import { importJobIdParamSchema } from '../../schemas/import.schemas.js'
import {
  stageImportData,
  retrieveStagedData,
  removeStagedData,
  enqueueImportJob,
  getImportJobStatus,
} from '../../services/csv-import-enqueuer.js'

function handlePolicyError(error: unknown, reply: FastifyReply) {
  if (error instanceof PolicyNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof ProposalNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof PolicyAlreadyCancelledError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof PolicyNotIssuableError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function policyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/policies',
    { preHandler: [requireAbility('create', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = issuePolicyBodySchema.parse(request.body)
      const useCase = container.resolve(IssuePolicy)
      try {
        const { coverageDetails, ...rest } = body
        const policy = await useCase.execute({
          organizationId: request.organizationId!,
          ...rest,
          coverageDetails: coverageDetails
            ? JSON.parse(JSON.stringify(coverageDetails))
            : undefined,
        })
        auditCreate({
          request,
          entityType: 'Policy',
          entityId: policy.id,
          after: policy,
        })
        return reply.status(201).send({ success: true, data: policy })
      } catch (error) {
        return handlePolicyError(error, reply)
      }
    }
  )

  // IMPORTANT: export route must be registered BEFORE /:id to avoid route conflict
  app.get(
    '/api/v1/policies/export',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { status, clientId, proposalId, branch, search } =
        listPoliciesQuerySchema.parse(request.query)
      const useCase = container.resolve(ExportPoliciesCsv)
      const csv = await useCase.execute({
        organizationId: request.organizationId!,
        status,
        clientId,
        proposalId,
        branch,
        search,
      })
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="apolices.csv"')
        .send(csv)
    }
  )

  // --- Import routes (must be before /:id) ---

  app.get(
    '/api/v1/policies/import/template',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const template =
        'Numero Apolice,CPF/CNPJ Cliente,Ramo,Premio (R$),Inicio Vigencia,Fim Vigencia,Seguradora,Status\n' +
        'APL-001,12345678901,AUTO,1500.00,2026-01-01,2027-01-01,Porto Seguro,ACTIVE\n'
      return reply
        .header('Content-Type', 'text/csv')
        .header(
          'Content-Disposition',
          'attachment; filename="modelo-apolices.csv"'
        )
        .send(template)
    }
  )

  app.post(
    '/api/v1/policies/import',
    { preHandler: [requireAbility('manage', 'Policy')] },
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
      const useCase = container.resolve(ParsePolicyImport)

      try {
        const result = await useCase.execute(
          csvContent,
          request.organizationId!
        )
        await stageImportData(
          result.jobId,
          request.organizationId!,
          result.validRows
        )
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
    '/api/v1/policies/import/:jobId/confirm',
    { preHandler: [requireAbility('manage', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { jobId } = importJobIdParamSchema.parse(request.params)
      const rows = await retrieveStagedData(jobId, request.organizationId!)
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
        entityType: 'policy',
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
    '/api/v1/policies/import/:jobId/status',
    { preHandler: [requireAbility('manage', 'Policy')] },
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
    '/api/v1/policies',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listPoliciesQuerySchema.parse(request.query)
      const useCase = container.resolve(ListPolicies)
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
    '/api/v1/policies/:id',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetPolicy)
      try {
        const policy = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: policy })
      } catch (error) {
        return handlePolicyError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/policies/:id/cancel',
    { preHandler: [requireAbility('delete', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const { reason } = cancelPolicyBodySchema.parse(request.body)
      const useCase = container.resolve(CancelPolicy)
      try {
        const policy = await useCase.execute(
          id,
          request.organizationId!,
          reason
        )
        auditUpdate({
          request,
          entityType: 'Policy',
          entityId: id,
          after: { status: 'CANCELLED' },
        })
        return reply.send({ success: true, data: policy })
      } catch (error) {
        return handlePolicyError(error, reply)
      }
    }
  )
}
