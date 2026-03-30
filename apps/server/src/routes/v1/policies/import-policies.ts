import {
  container,
  CsvImportError,
  MAX_IMPORT_FILE_SIZE,
  ParsePolicyImport,
} from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import {
  enqueueImportJob,
  getImportJobStatus,
  removeStagedData,
  retrieveStagedData,
  stageImportData,
} from '../../../services/csv-import-enqueuer.js'
import {
  importJobIdParam,
  importUploadResponse,
  importConfirmResponse,
  importStatusResponse,
  errorResponse,
} from './_schemas.js'

export function importPoliciesRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  typedApp.route({
    method: 'GET',
    url: '/api/v1/policies/import/template',
    schema: {
      tags: ['Policies'],
      summary: 'Download CSV import template for policies',
      operationId: 'importTemplatePolicies',
    },
    preHandler: [requireAbility('read', 'Policy')],
    handler: async (_request, reply) => {
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
    },
  })

  typedApp.route({
    method: 'POST',
    url: '/api/v1/policies/import',
    schema: {
      tags: ['Policies'],
      summary: 'Upload and parse a policy CSV for import preview',
      operationId: 'importUploadPolicies',
      response: {
        200: importUploadResponse,
        400: errorResponse,
        413: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('manage', 'Policy')],
    handler: async (request, reply) => {
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
            message: 'Apenas arquivos CSV são aceitos',
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
    },
  })

  typedApp.route({
    method: 'POST',
    url: '/api/v1/policies/import/:jobId/confirm',
    schema: {
      tags: ['Policies'],
      summary: 'Confirm and enqueue a staged policy import job',
      operationId: 'importConfirmPolicies',
      params: importJobIdParam,
      response: { 200: importConfirmResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('manage', 'Policy')],
    handler: async (request, reply) => {
      const rows = await retrieveStagedData(
        request.params.jobId,
        request.organizationId!
      )
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

      await enqueueImportJob(request.params.jobId, {
        entityType: 'policy',
        organizationId: request.organizationId!,
        userId: request.user!.id,
        rows,
        totalRows: rows.length,
      })

      await removeStagedData(request.params.jobId)

      return reply.send({
        success: true,
        data: { jobId: request.params.jobId },
      })
    },
  })

  typedApp.route({
    method: 'GET',
    url: '/api/v1/policies/import/:jobId/status',
    schema: {
      tags: ['Policies'],
      summary: 'Check the status of a policy import job',
      operationId: 'importStatusPolicies',
      params: importJobIdParam,
      response: { 200: importStatusResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('manage', 'Policy')],
    handler: async (request, reply) => {
      const { status, organizationId, progress, result } =
        await getImportJobStatus(request.params.jobId)

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
    },
  })
}
