import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { createClaimRoute } from './create-claim.js'
import { getClaimRoute } from './get-claim.js'
import { listClaimsRoute } from './list-claims.js'
import { updateClaimStatusRoute } from './update-claim-status.js'
import { deleteClaimRoute } from './delete-claim.js'
import { createOccurrenceRoute } from './create-occurrence.js'
import { listOccurrencesRoute } from './list-occurrences.js'

export async function claimRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  createClaimRoute(app)
  getClaimRoute(app)
  listClaimsRoute(app)
  updateClaimStatusRoute(app)
  deleteClaimRoute(app)
  createOccurrenceRoute(app)
  listOccurrencesRoute(app)
}
