import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prismaAdmin as prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { DashboardReportPdf } from '../../../pdf-templates/dashboard-report-pdf.js'
import { errorResponse } from '../../shared/response.schema.js'
import { dashboardPdfResponse, dashboardStatsQuerySchema } from './_schemas.js'
import { buildDashboardData } from './stats-helpers.js'

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

      const data = await buildDashboardData(orgId, preset)

      const org = await prisma.organization.findUnique({
        where: { id: orgId },
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

      const storage = container.resolve<StorageProvider>('StorageProvider')
      let logoUrl: string | null = null
      if (org.logo) {
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      const buffer = Buffer.from(
        await renderToBuffer(
          DashboardReportPdf({
            organization: { name: org.name, logoUrl },
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
    },
  })
}
