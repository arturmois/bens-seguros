import type { FastifyInstance } from 'fastify'

import { internalAuthMiddleware } from '../../../middlewares/internal-auth-middleware.js'
import { internalPromoteContactRoute } from './promote-contact.js'

export async function internalContactRoutes(app: FastifyInstance) {
  app.addHook('preHandler', internalAuthMiddleware)
  internalPromoteContactRoute(app)
}
