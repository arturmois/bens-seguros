import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { globalSearchRoute } from './global-search.js'

export async function searchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  globalSearchRoute(app)
}
