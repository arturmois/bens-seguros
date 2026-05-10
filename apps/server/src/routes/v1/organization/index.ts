import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { getOrganizationRoute } from './get-organization.js'
import { updateOrganizationRoute } from './update-organization.js'
import { uploadLogoRoute } from './upload-logo.js'

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  getOrganizationRoute(app)
  uploadLogoRoute(app)
  updateOrganizationRoute(app)
}
