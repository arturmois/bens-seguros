import type { FastifyInstance } from 'fastify'

import { internalAuthMiddleware } from '../../../middlewares/internal-auth-middleware.js'
import { createLeadRoute } from './create-lead.js'

export async function internalLeadRoutes(app: FastifyInstance) {
  app.addHook('preHandler', internalAuthMiddleware)

  createLeadRoute(app)
}
