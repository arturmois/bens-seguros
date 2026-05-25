import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createChatTokenRoute } from './create-chat-token.js'

export async function chatTokenRoute(app: FastifyInstance) {
  applyTenantStack(app)
  createChatTokenRoute(app)
}
