import type { FastifyInstance } from 'fastify'

import type { HmacTenantApi } from '../../../bootstrap/compose.js'
import { getInternalEntitlementsRoute } from './get-entitlements.js'

export function createInternalBillingRoutes(hmac: {
  forTenant: (organizationId: string) => HmacTenantApi
}) {
  return async function internalBillingRoutes(app: FastifyInstance) {
    getInternalEntitlementsRoute(app, {
      getEntitlementsFor: (organizationId) =>
        hmac.forTenant(organizationId).getEntitlementsForOrg,
    })
  }
}
