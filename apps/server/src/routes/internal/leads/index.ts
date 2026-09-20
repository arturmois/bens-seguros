import type { FastifyInstance } from 'fastify'

import { createInternalClaimRoute } from './create-claim.js'
import { createLeadRoute } from './create-lead.js'
import { listInternalPoliciesRoute } from './list-policies.js'
import { listInternalProposalsRoute } from './list-proposals.js'
import { searchClientsRoute } from './search-clients.js'
import { updateClientRoute } from './update-client.js'
import { updateInternalProposalDetailsRoute } from './update-proposal-details.js'
import type { HmacTenantApi } from '../../../bootstrap/compose.js'

export interface InternalLeadHmac {
  forTenant: (organizationId: string) => HmacTenantApi
}

export function createInternalLeadRoutes(hmac: InternalLeadHmac) {
  return async function internalLeadRoutes(app: FastifyInstance) {
    const forOrg = (organizationId: string) => hmac.forTenant(organizationId)
    createLeadRoute(app, {
      captureLeadFor: (organizationId) => forOrg(organizationId).captureLead,
    })
    searchClientsRoute(app)
    updateClientRoute(app, {
      updateClientFiscalFor: (organizationId) =>
        forOrg(organizationId).updateClientFiscal,
    })
    createInternalClaimRoute(app)
    listInternalProposalsRoute(app, {
      listProposalsFor: (organizationId) =>
        forOrg(organizationId).listProposalsForClient,
    })
    listInternalPoliciesRoute(app, {
      listPoliciesFor: (organizationId) =>
        forOrg(organizationId).listActivePoliciesForClient,
    })
    updateInternalProposalDetailsRoute(app)
  }
}
