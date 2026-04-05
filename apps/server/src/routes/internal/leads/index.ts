import type { FastifyInstance } from 'fastify'

import { internalAuthMiddleware } from '../../../middlewares/internal-auth-middleware.js'
import { createLeadRoute } from './create-lead.js'
import { searchClientsRoute } from './search-clients.js'
import { updateClientRoute } from './update-client.js'

export async function internalLeadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', internalAuthMiddleware)

  createLeadRoute(app)
  searchClientsRoute(app)
  updateClientRoute(app)
}
