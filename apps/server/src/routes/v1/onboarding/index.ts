import type { Auth } from '@repo/auth'
import type { FastifyInstance } from 'fastify'

import { completeOnboardingRoute } from './complete.js'

export function createOnboardingRoutes(auth: Auth) {
  return async function onboardingRoutes(app: FastifyInstance) {
    completeOnboardingRoute(app, auth)
  }
}
