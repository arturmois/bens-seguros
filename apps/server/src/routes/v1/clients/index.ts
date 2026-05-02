import type { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { deleteClientRoute } from './delete-client.js'
import { exportClientsRoute } from './export-clients.js'
import { getClientRoute } from './get-client.js'
import { importClientsRoutes } from './import-clients.js'
import { lgpdDeleteClientRoute } from './lgpd-delete-client.js'
import { listClientsRoute } from './list-clients.js'
import { updateClientRoute } from './update-client.js'

export async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // Order matters: static paths (export, import) must be registered
  // BEFORE parametric paths (/:id) to avoid route conflicts.
  exportClientsRoute(app)
  importClientsRoutes(app)
  listClientsRoute(app)
  lgpdDeleteClientRoute(app)
  getClientRoute(app)
  updateClientRoute(app)
  deleteClientRoute(app)
}
