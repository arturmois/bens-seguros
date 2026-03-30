import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { listInvitationsRoute } from './list-invitations.js'
import { createInvitationRoute } from './create-invitation.js'
import { deleteInvitationRoute } from './delete-invitation.js'

export async function invitationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  listInvitationsRoute(app)
  createInvitationRoute(app)
  deleteInvitationRoute(app)
}
