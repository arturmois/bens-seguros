import type { FastifyInstance } from 'fastify'

import { getTermsStatusRoute } from './get-terms-status.js'
import { acceptTermsRoute } from './accept-terms.js'

export async function termsRoutes(app: FastifyInstance) {
  getTermsStatusRoute(app)
  acceptTermsRoute(app)
}
