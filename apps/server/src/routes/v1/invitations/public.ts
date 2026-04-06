import type { Auth } from '@repo/auth'
import type { FastifyInstance } from 'fastify'
import { acceptInvitationRoute } from './accept-invitation.js'
import { getPublicInvitationRoute } from './get-public-invitation.js'

export function publicInvitationRoutes(app: FastifyInstance, auth: Auth) {
  getPublicInvitationRoute(app)
  acceptInvitationRoute(app, auth)
}
