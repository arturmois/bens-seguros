import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  type CacheService,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { DashboardReportPdf } from '../../pdf-templates/dashboard-report-pdf.js'
import { dashboardStatsQuerySchema } from '../../schemas/stats.schemas.js'
import { buildDashboardData } from './stats-helpers.js'

const PRESET_LABELS: Record<string, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '6m': 'Últimos 6 meses',
}

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.get(
    '/api/v1/stats/dashboard',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { preset } = dashboardStatsQuerySchema.parse(request.query)
      const orgId = request.organizationId!

      const cache = container.resolve<CacheService>('CacheService')
      const cacheKey = `dashboard:stats:${orgId}:${preset}`

      const cached = await cache.get(cacheKey)
      if (cached) {
        return reply.send({ success: true, data: cached })
      }

      const data = await buildDashboardData(orgId, preset)
      await cache.set(cacheKey, data, 60)

      return reply.send({ success: true, data })
    }
  )

  app.post(
    '/api/v1/stats/dashboard/pdf',
    { preHandler: [requireAbility('read', 'Client')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { preset } = dashboardStatsQuerySchema.parse(request.query)
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
      await documentRepo.create({
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
    }
  )
}
