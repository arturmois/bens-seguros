import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { exportDashboardPdfRoute } from './export-dashboard-pdf.js'
import { getDashboardStatsRoute } from './get-dashboard-stats.js'

export async function statsRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  getDashboardStatsRoute(app)
  exportDashboardPdfRoute(app)
}
