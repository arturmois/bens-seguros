import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { createAssistanceRoute } from './create-assistance.js'
import { getAssistanceRoute } from './get-assistance.js'
import { listAssistancesRoute } from './list-assistances.js'
import { updateAssistanceStatusRoute } from './update-assistance-status.js'

export async function assistanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  createAssistanceRoute(app)
  listAssistancesRoute(app)
  getAssistanceRoute(app)
  updateAssistanceStatusRoute(app)
}
