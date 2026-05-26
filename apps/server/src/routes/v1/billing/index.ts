import type { FastifyInstance } from 'fastify'
import type IORedis from 'ioredis'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { getBillingCurrentRoute } from './get-current.js'
import { listBillingInvoicesRoute } from './list-invoices.js'

export function createBillingRoutes(redis: IORedis) {
  return async function billingRoutes(app: FastifyInstance) {
    app.addHook('preHandler', tenantMiddleware)
    getBillingCurrentRoute(app, redis)
    listBillingInvoicesRoute(app)
  }
}
