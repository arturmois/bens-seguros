import type { CaptureLead } from '@repo/core'
import type { FastifyInstance } from 'fastify'

import { createInternalClaimRoute } from './create-claim.js'
import { createLeadRoute } from './create-lead.js'
import { listInternalPoliciesRoute } from './list-policies.js'
import { listInternalProposalsRoute } from './list-proposals.js'
import { searchClientsRoute } from './search-clients.js'
import { updateClientRoute } from './update-client.js'
import { updateInternalProposalDetailsRoute } from './update-proposal-details.js'

export interface InternalLeadHmac {
  forTenant: (organizationId: string) => { captureLead: CaptureLead }
}

export function createInternalLeadRoutes(hmac: InternalLeadHmac) {
  return async function internalLeadRoutes(app: FastifyInstance) {
    createLeadRoute(app, {
      captureLeadFor: (organizationId) =>
        hmac.forTenant(organizationId).captureLead,
    })
    searchClientsRoute(app)
    updateClientRoute(app)
    createInternalClaimRoute(app)
    listInternalProposalsRoute(app)
    listInternalPoliciesRoute(app)
    updateInternalProposalDetailsRoute(app)
  }
}
