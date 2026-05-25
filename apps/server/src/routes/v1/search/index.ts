import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { globalSearchRoute } from './global-search.js'

export async function searchRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  globalSearchRoute(app)
}
