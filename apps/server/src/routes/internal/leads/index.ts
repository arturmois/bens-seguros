import type { FastifyInstance } from 'fastify'

import { internalAuthMiddleware } from '../../../middlewares/internal-auth-middleware.js'
import { createInternalClaimRoute } from './create-claim.js'
import { createLeadRoute } from './create-lead.js'
import { listInternalPoliciesRoute } from './list-policies.js'
import { listInternalProposalsRoute } from './list-proposals.js'
import { searchClientsRoute } from './search-clients.js'
import { updateClientRoute } from './update-client.js'
import { updateInternalProposalDetailsRoute } from './update-proposal-details.js'

export async function internalLeadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', internalAuthMiddleware)
  createLeadRoute(app)
  searchClientsRoute(app)
  updateClientRoute(app)
  createInternalClaimRoute(app)
  listInternalProposalsRoute(app)
  listInternalPoliciesRoute(app)
  updateInternalProposalDetailsRoute(app)
}
