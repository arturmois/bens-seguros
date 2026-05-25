import type { FastifyInstance } from 'fastify'
import { createSubscriptionMiddleware } from './subscription-middleware.js'
import { tenantMiddleware } from './tenant-middleware.js'

// Registers the standard preHandler chain for authenticated tenant routes:
// 1. tenantMiddleware — populates request.organizationId, role, tenantPrisma
// 2. subscriptionMiddleware — reads subscription from cache, gates by status
//    (402 when EXPIRED/PAST_DUE/etc), injects request.subscription +
//    request.entitlements
//
// Pulls `redis` from app.redis (decorated in buildApp). Routes call this
// instead of `app.addHook('preHandler', tenantMiddleware)` directly.
export function applyTenantStack(app: FastifyInstance): void {
  app.addHook('preHandler', tenantMiddleware)
  app.addHook('preHandler', createSubscriptionMiddleware(app.redis))
}
