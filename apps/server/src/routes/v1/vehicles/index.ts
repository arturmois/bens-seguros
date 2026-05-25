import type { FastifyInstance } from 'fastify'
import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { lookupVehicleRoute } from './lookup-vehicle.js'

export async function vehicleRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  lookupVehicleRoute(app)
}
