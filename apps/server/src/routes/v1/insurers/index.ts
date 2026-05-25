import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createInsurerRoute } from './create-insurer.js'
import { getInsurerRoute } from './get-insurer.js'
import { listInsurersRoute } from './list-insurers.js'
import { updateInsurerRoute } from './update-insurer.js'

export async function insurerRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  createInsurerRoute(app)
  listInsurersRoute(app)
  getInsurerRoute(app)
  updateInsurerRoute(app)
}
