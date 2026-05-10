import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { listAuditLogsRoute } from './list-audit-logs.js'

export async function auditLogRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  listAuditLogsRoute(app)
}
