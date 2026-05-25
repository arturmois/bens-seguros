import type { FastifyInstance } from 'fastify'

import { applyTenantStack } from '../../../middlewares/tenant-stack.js'
import { deleteMemberRoute } from './delete-member.js'
import { listMembersRoute } from './list-members.js'
import { updateMemberRoleRoute } from './update-member-role.js'

export async function memberRoutes(app: FastifyInstance) {
  applyTenantStack(app)
  listMembersRoute(app)
  updateMemberRoleRoute(app)
  deleteMemberRoute(app)
}
