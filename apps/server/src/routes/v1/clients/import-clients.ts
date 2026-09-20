import {
  CsvImportError,
  MAX_IMPORT_FILE_SIZE,
  type ClientsApi,
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
  errorResponse,
  importConfirmResponse,
  importJobIdParamSchema,
  importStatusResponse,
  importUploadResponse,
} from './_schemas.js'

export function importClientsRoutes(app: FastifyInstance, clients: ClientsApi) {
  const typed = app.withTypeProvider<ZodTypeProvider>()
  typed.route({
    method: 'GET',
    url: '/api/v1/clients/import/template',
    schema: {
      tags: ['Clients'],
      summary: 'Download CSV import template for clients',
      operationId: 'importTemplateClients',
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (_request, reply) => {
      const template =
        '\uFEFFNome,CPF/CNPJ,Tipo,Email,Telefone,Data Nascimento,Profissão,Estado Civil,Tags\n' +
        'João Silva,12345678901,CLIENT,joao@email.com,11999999999,1990-01-15,Engenheiro,MARRIED,vip;indicação\n'
      return reply
        .header('Content-Type', 'text/csv')
        .header(
          'Content-Disposition',
          'attachment; filename="modelo-clientes.csv"'
        )
        .send(template)
    },
  })
  typed.route({
    method: 'POST',
    url: '/api/v1/clients/import',
    schema: {
      tags: ['Clients'],
      summary: 'Upload CSV file for client import (preview + validation)',
      operationId: 'importUploadClients',
      response: {
        200: importUploadResponse,
        400: errorResponse,
        413: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('manage', 'Client')],
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
      const useCase = clients.parseClientImport
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
  typed.route({
    method: 'POST',
    url: '/api/v1/clients/import/:jobId/confirm',
    schema: {
      tags: ['Clients'],
      summary: 'Confirm and enqueue a staged client import job',
      operationId: 'importConfirmClients',
      params: importJobIdParamSchema,
      response: { 200: importConfirmResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('manage', 'Client')],
    handler: async (request, reply) => {
      const { jobId } = request.params
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
        entityType: 'client',
        organizationId: request.organizationId!,
        userId: request.user!.id,
        rows,
        totalRows: rows.length,
      })
      await removeStagedData(jobId)
      return reply.send({ success: true, data: { jobId } })
    },
  })
  typed.route({
    method: 'GET',
    url: '/api/v1/clients/import/:jobId/status',
    schema: {
      tags: ['Clients'],
      summary: 'Get the status of a client import job',
      operationId: 'importStatusClients',
      params: importJobIdParamSchema,
      response: { 200: importStatusResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('manage', 'Client')],
    handler: async (request, reply) => {
      const { jobId } = request.params
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
    },
  })
}
