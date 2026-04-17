import type { FastifyInstance } from 'fastify'
import { getCepRoute } from './get-cep.js'

export async function cepRoutes(app: FastifyInstance) {
  getCepRoute(app)
}
