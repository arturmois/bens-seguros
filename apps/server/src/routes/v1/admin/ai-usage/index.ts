import type { FastifyInstance } from 'fastify'
import { requireSuperAdmin } from '../../../../middlewares/require-super-admin.js'
import { listAiUsageRoute } from './list-ai-usage.js'

export async function adminAiUsageRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireSuperAdmin)
  listAiUsageRoute(app)
}
