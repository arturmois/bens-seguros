import type { FastifyInstance } from 'fastify'

import { internalPromoteContactRoute } from './promote-contact.js'

export async function internalContactRoutes(app: FastifyInstance) {
  internalPromoteContactRoute(app)
}
