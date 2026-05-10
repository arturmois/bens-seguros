import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { createInsurerRoute } from './create-insurer.js'
import { listInsurersRoute } from './list-insurers.js'
import { updateInsurerRoute } from './update-insurer.js'

export async function insurerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  createInsurerRoute(app)
  listInsurersRoute(app)
  updateInsurerRoute(app)
}
