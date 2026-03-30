import type { FastifyInstance } from 'fastify'

import { listTenantsRoute } from './list-tenants.js'

export async function tenantRoutes(app: FastifyInstance) {
  listTenantsRoute(app)
}
