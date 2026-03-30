import type { FastifyInstance } from 'fastify'

import { tenantMiddleware } from '../../../middlewares/tenant-middleware.js'
import { listMembersRoute } from './list-members.js'
import { updateMemberRoleRoute } from './update-member-role.js'
import { deleteMemberRoute } from './delete-member.js'

export async function memberRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  listMembersRoute(app)
  updateMemberRoleRoute(app)
  deleteMemberRoute(app)
}
