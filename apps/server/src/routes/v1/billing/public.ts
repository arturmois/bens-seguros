import type { FastifyInstance } from 'fastify'

import { listPublicPlansRoute } from './list-plans.js'

export function publicBillingRoutes(app: FastifyInstance) {
  listPublicPlansRoute(app)
}
