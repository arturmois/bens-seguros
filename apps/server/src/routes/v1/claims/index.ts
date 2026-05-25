import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createClaimRoute } from './create-claim.js'
import { createOccurrenceRoute } from './create-occurrence.js'
import { deleteClaimRoute } from './delete-claim.js'
import { getClaimRoute } from './get-claim.js'
import { listClaimsRoute } from './list-claims.js'
import { listOccurrencesRoute } from './list-occurrences.js'
import { updateClaimStatusRoute } from './update-claim-status.js'

export async function claimRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  createClaimRoute(app)
  getClaimRoute(app)
  listClaimsRoute(app)
  updateClaimStatusRoute(app)
  deleteClaimRoute(app)
  createOccurrenceRoute(app)
  listOccurrencesRoute(app)
}
