import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { getGoalsProgressRoute } from './get-goals-progress.js'
import { upsertGoalsByYearRoute } from './upsert-goals-by-year.js'

export async function goalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  getGoalsProgressRoute(app)
  upsertGoalsByYearRoute(app)
}
