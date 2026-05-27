import type { BillingProvider } from '@repo/billing-port'
import type { FastifyInstance } from 'fastify'
import type IORedis from 'ioredis'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { cancelBillingSubscriptionRoute } from './cancel-subscription.js'
import { getBillingAiUsageRoute } from './get-ai-usage.js'
import { getBillingCurrentRoute } from './get-current.js'
import { listBillingInvoicesRoute } from './list-invoices.js'

export function createBillingRoutes(
  redis: IORedis,
  asaasProvider: BillingProvider | null
) {
  return async function billingRoutes(app: FastifyInstance) {
    app.addHook('preHandler', tenantMiddleware)
    getBillingCurrentRoute(app, redis)
    listBillingInvoicesRoute(app)
    getBillingAiUsageRoute(app)
    cancelBillingSubscriptionRoute(app, asaasProvider, redis)
  }
}
