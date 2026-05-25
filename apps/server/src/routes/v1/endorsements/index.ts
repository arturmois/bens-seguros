import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createEndorsementRoute } from './create-endorsement.js'
import { getEndorsementRoute } from './get-endorsement.js'
import { listEndorsementsRoute } from './list-endorsements.js'

export async function endorsementRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  createEndorsementRoute(app)
  listEndorsementsRoute(app)
  getEndorsementRoute(app)
}
