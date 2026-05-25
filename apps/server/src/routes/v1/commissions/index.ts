import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { approveAdminRoute } from './approve-admin.js'
import { approveCommercialRoute } from './approve-commercial.js'
import { exportCommissionsRoute } from './export-commissions.js'
import { getCommissionRoute } from './get-commission.js'
import { listCommissionsRoute } from './list-commissions.js'
import { payCommissionRoute } from './pay-commission.js'
import { rejectCommissionRoute } from './reject-commission.js'
import { reverseCommissionRoute } from './reverse-commission.js'

export async function commissionRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  exportCommissionsRoute(app)
  listCommissionsRoute(app)
  getCommissionRoute(app)
  approveCommercialRoute(app)
  approveAdminRoute(app)
  rejectCommissionRoute(app)
  payCommissionRoute(app)
  reverseCommissionRoute(app)
}
