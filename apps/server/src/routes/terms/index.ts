import type { FastifyInstance } from 'fastify'

import { acceptTermsRoute } from './accept-terms.js'
import { getTermsStatusRoute } from './get-terms-status.js'

export async function termsRoutes(app: FastifyInstance) {
  getTermsStatusRoute(app)
  acceptTermsRoute(app)
}
