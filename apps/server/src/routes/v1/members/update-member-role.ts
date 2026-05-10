import { container, UpdateMemberRole } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  changeMemberRoleBodySchema,
  idParamSchema,
  memberUpdateResponse,
} from './_schemas.js'

export function updateMemberRoleRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/members/:id/role',
    schema: {
      operationId: 'updateMemberRole',
      tags: ['Members'],
      summary: 'Update a member role',
      params: idParamSchema,
      body: changeMemberRoleBodySchema,
      response: { 200: memberUpdateResponse },
    },
    preHandler: [requireAbility('update', 'Member')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        const { role: newRole } = request.body
        const organizationId = request.organizationId!
        const callerRole = request.role!
        const callerUserId = request.user!.id
        const updateMemberRole = container.resolve(UpdateMemberRole)
        const { member, before } = await updateMemberRole.execute({
          id,
          organizationId,
          callerUserId,
          callerRole,
          newRole,
        })
        auditUpdate({
          request,
          entityType: 'Member',
          entityId: id,
          before,
          after: { role: newRole },
        })
        return reply.send({ success: true, data: member })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
