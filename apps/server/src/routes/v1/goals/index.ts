import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { getGoalsProgressRoute } from './get-goals-progress.js'
import { upsertGoalsByYearRoute } from './upsert-goals-by-year.js'

export async function goalRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  getGoalsProgressRoute(app)
  upsertGoalsByYearRoute(app)
}
