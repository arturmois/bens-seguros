import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createAssistanceRoute } from './create-assistance.js'
import { getAssistanceRoute } from './get-assistance.js'
import { listAssistancesRoute } from './list-assistances.js'
import { updateAssistanceStatusRoute } from './update-assistance-status.js'

export async function assistanceRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  createAssistanceRoute(app)
  listAssistancesRoute(app)
  getAssistanceRoute(app)
  updateAssistanceStatusRoute(app)
}
