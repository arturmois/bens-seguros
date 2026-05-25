import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { createInvitationRoute } from './create-invitation.js'
import { deleteInvitationRoute } from './delete-invitation.js'
import { listInvitationsRoute } from './list-invitations.js'

export async function invitationRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  listInvitationsRoute(app)
  createInvitationRoute(app)
  deleteInvitationRoute(app)
}
