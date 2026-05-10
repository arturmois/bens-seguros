import { container, DeactivateMember } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditDelete } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema, memberDeleteResponse } from './_schemas.js'

export function deleteMemberRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/api/v1/members/:id',
    schema: {
      operationId: 'deactivateMember',
      tags: ['Members'],
      summary: 'Deactivate a member',
      params: idParamSchema,
      response: { 200: memberDeleteResponse },
    },
    preHandler: [requireAbility('delete', 'Member')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        const organizationId = request.organizationId!
        const callerRole = request.role!
        const callerUserId = request.user!.id
        const deactivateMember = container.resolve(DeactivateMember)
        const { before } = await deactivateMember.execute({
          id,
          organizationId,
          callerUserId,
          callerRole,
        })
        auditDelete({
          request,
          entityType: 'Member',
          entityId: id,
          before,
        })
        return reply.send({ success: true, data: { id } })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
