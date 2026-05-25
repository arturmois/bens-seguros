import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { getOrganizationRoute } from './get-organization.js'
import { updateOrganizationRoute } from './update-organization.js'
import { uploadLogoRoute } from './upload-logo.js'

export async function organizationRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  getOrganizationRoute(app)
  uploadLogoRoute(app)
  updateOrganizationRoute(app)
}
