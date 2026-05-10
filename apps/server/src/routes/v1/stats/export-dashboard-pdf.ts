import { renderToBuffer } from '@react-pdf/renderer'
import {
  BuildDashboardSnapshot,
  container,
  type DocumentRepository,
  GetOrganization,
  type StorageProvider,
} from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { DashboardReportPdf } from '../../../pdf-templates/dashboard-report-pdf.js'
import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../handle-domain-error.js'
import { dashboardPdfResponse, dashboardStatsQuerySchema } from './_schemas.js'

const PRESET_LABELS: Record<string, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '6m': 'Últimos 6 meses',
}

export function exportDashboardPdfRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/stats/dashboard/pdf',
    schema: {
      operationId: 'exportDashboardPdf',
      tags: ['Stats'],
      summary: 'Export dashboard report as PDF',
      querystring: dashboardStatsQuerySchema,
      response: { 200: dashboardPdfResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (request, reply) => {
      const { preset } = request.query
      const orgId = request.organizationId!
      const dashboardUseCase = container.resolve(BuildDashboardSnapshot)
      const orgUseCase = container.resolve(GetOrganization)
      try {
        const [data, organization] = await Promise.all([
          dashboardUseCase.execute(orgId, preset),
          orgUseCase.execute(orgId),
        ])
        const storage = container.resolve<StorageProvider>('StorageProvider')
        const buffer = Buffer.from(
          await renderToBuffer(
            DashboardReportPdf({
              organization: {
                name: organization.name,
                logoUrl: organization.logo,
              },
              period: PRESET_LABELS[preset] ?? preset,
              generatedBy: request.user?.name ?? 'Usuario',
              comparison: data.comparison,
              totalPremium: data.totalPremium,
              averageTicket: data.averageTicket,
              commissionsReceivable: data.commissionsReceivable,
              ranking: data.ranking,
            })
          )
        )
        const fileName = `relatorio-gerencial-${preset}.pdf`
        const storageKey = `organizations/${orgId}/reports/${fileName}`
        await storage.upload(storageKey, buffer, 'application/pdf')
        const documentRepo =
          container.resolve<DocumentRepository>('DocumentRepository')
        await documentRepo.upsertByStorageKey({
          organizationId: orgId,
          entityType: 'CLIENT',
          entityId: orgId,
          type: 'OTHER',
          fileName,
          mimeType: 'application/pdf',
          sizeBytes: buffer.length,
          storageKey,
          createdBy: request.user!.id,
        })
        const url = await storage.getSignedUrl(storageKey)
        return reply.send({ success: true, data: { url } })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
