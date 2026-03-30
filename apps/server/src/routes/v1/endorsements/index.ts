import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { createEndorsementRoute } from './create-endorsement.js'
import { listEndorsementsRoute } from './list-endorsements.js'
import { getEndorsementRoute } from './get-endorsement.js'

export async function endorsementRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  createEndorsementRoute(app)
  listEndorsementsRoute(app)
  getEndorsementRoute(app)
}
