import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { listAuditLogsRoute } from './list-audit-logs.js'

export async function auditLogRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  listAuditLogsRoute(app)
}
