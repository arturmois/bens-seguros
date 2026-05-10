import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { createChatTokenRoute } from './create-chat-token.js'

export async function chatTokenRoute(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  createChatTokenRoute(app)
}
