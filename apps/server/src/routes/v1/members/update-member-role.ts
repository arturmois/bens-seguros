import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '@repo/db'
import { container, type CacheService, UpdateMemberRole } from '@repo/core'
import type { Role } from '@repo/auth/roles'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { idParamSchema, changeMemberRoleBodySchema } from './_schemas.js'
import { handleDomainError } from '../handle-domain-error.js'

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

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
    },
    preHandler: [requireAbility('update', 'Member')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        const { role: newRole } = request.body
        const organizationId = request.organizationId!
        const callerRole = request.role! as Role
        const callerUserId = request.user!.id

        const updateMemberRole = container.resolve(UpdateMemberRole)
        const before = await prisma.member.findFirst({
          where: { id, organizationId, active: true },
          select: { role: true },
        })

        const updated = await updateMemberRole.execute({
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
          before: { role: before?.role },
          after: { role: newRole },
        })

        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${organizationId}:members`)
        }

        return reply.send({ success: true, data: updated })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
