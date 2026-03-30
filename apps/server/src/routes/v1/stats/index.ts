import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { getDashboardStatsRoute } from './get-dashboard-stats.js'
import { exportDashboardPdfRoute } from './export-dashboard-pdf.js'

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  getDashboardStatsRoute(app)
  exportDashboardPdfRoute(app)
}
