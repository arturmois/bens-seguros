import { renderToBuffer } from '@react-pdf/renderer'
import { z } from 'zod'
import {
  CancelPolicy,
  container,
  CsvImportError,
  ExportPoliciesCsv,
  GetPolicy,
  IssuePolicy,
  ListPolicies,
  MAX_IMPORT_FILE_SIZE,
  ParsePolicyImport,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { PolicySummaryPdf } from '../../pdf-templates/policy-summary-pdf.js'
import { idParamSchema } from '../../schemas/client.schemas.js'
import { importJobIdParamSchema } from '../../schemas/import.schemas.js'
import {
  cancelPolicyBodySchema,
  issuePolicyBodySchema,
  listPoliciesQuerySchema,
} from '../../schemas/policy.schemas.js'
import { auditCreate, auditUpdate } from '../../services/audit-logger.js'
import {
  enqueueImportJob,
  getImportJobStatus,
  removeStagedData,
  retrieveStagedData,
  stageImportData,
} from '../../services/csv-import-enqueuer.js'
import { handleDomainError } from './handle-domain-error.js'

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
        return handleDomainError(error, reply)
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
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        status,
        clientId,
        proposalId,
        branch,
        search,
      })

      reply.raw.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="apolices.csv"',
        'Transfer-Encoding': 'chunked',
      })

      for await (const chunk of stream) {
        reply.raw.write(chunk)
      }

      reply.raw.end()
      return reply
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
              'Dados de importação não encontrados ou expirados. Faça o upload novamente.',
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
      const { status, organizationId, progress, result } =
        await getImportJobStatus(jobId)

      if (status === 'not_found' || organizationId !== request.organizationId) {
        return reply.status(404).send({
          success: false,
          error: { code: 'JOB_NOT_FOUND', message: 'Job não encontrado' },
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
        meta: { nextCursor: result.nextCursor },
      })
    }
  )

  // IMPORTANT: /pdf route must be registered BEFORE /:id to avoid route conflict
  app.post(
    '/api/v1/policies/:id/pdf',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const organizationId = request.organizationId!
      const { force } = z
        .object({ force: z.string().optional() })
        .parse(request.query)
      const forceRegenerate = force === 'true'

      const documentRepo =
        container.resolve<DocumentRepository>('DocumentRepository')
      const storage = container.resolve<StorageProvider>('StorageProvider')

      if (!forceRegenerate) {
        const existing = await documentRepo.findByEntity(
          'POLICY',
          id,
          organizationId
        )
        const existingPdf = existing.find((doc) => doc.type === 'POLICY_PDF')
        if (existingPdf) {
          const url = await storage.getSignedUrl(existingPdf.storageKey)
          return reply.send({ success: true, data: { url, cached: true } })
        }
      }

      const getPolicyUseCase = container.resolve(GetPolicy)
      let policy
      try {
        policy = await getPolicyUseCase.execute(id, organizationId)
      } catch (error) {
        return handleDomainError(error, reply)
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, logo: true },
      })

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organização não encontrada',
          },
        })
      }

      let logoUrl: string | null = null
      if (org.logo) {
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      const organizationData = {
        id: org.id,
        name: org.name,
        logo: logoUrl,
      }

      const buffer = Buffer.from(
        await renderToBuffer(
          PolicySummaryPdf({
            policy,
            organization: organizationData,
          })
        )
      )

      const storageKey = `organizations/${organizationId}/policies/${id}/apolice.pdf`
      await storage.upload(storageKey, buffer, 'application/pdf')

      await documentRepo.create({
        organizationId,
        entityType: 'POLICY',
        entityId: id,
        type: 'POLICY_PDF',
        fileName: `apolice-${policy.policyNumber}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
        storageKey,
        createdBy: request.user!.id,
      })

      const url = await storage.getSignedUrl(storageKey)
      return reply.send({ success: true, data: { url, cached: false } })
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
        return handleDomainError(error, reply)
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
        return handleDomainError(error, reply)
      }
    }
  )
}
