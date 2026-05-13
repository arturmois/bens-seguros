import type { FastifyInstance } from 'fastify'
import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { lookupVehicleRoute } from './lookup-vehicle.js'

export async function vehicleRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)
  lookupVehicleRoute(app)
}
