import type { FastifyInstance } from 'fastify'
import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createClientRoute } from './create-client.js'
import { deleteClientRoute } from './delete-client.js'
import { exportClientsRoute } from './export-clients.js'
import { getClientRoute } from './get-client.js'
import { importClientsRoutes } from './import-clients.js'
import { lgpdDeleteClientRoute } from './lgpd-delete-client.js'
import { listClientsRoute } from './list-clients.js'
import { updateClientRoute } from './update-client.js'

export async function clientRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  exportClientsRoute(app)
  importClientsRoutes(app)
  createClientRoute(app)
  listClientsRoute(app)
  lgpdDeleteClientRoute(app)
  getClientRoute(app)
  updateClientRoute(app)
  deleteClientRoute(app)
}
