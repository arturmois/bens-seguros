import { InvitationNotFoundError } from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditDelete } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParamSchema, invitationDeleteResponse } from './_schemas.js'

export function deleteInvitationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/api/v1/invitations/:id',
    schema: {
      operationId: 'revokeInvitation',
      tags: ['Invitations'],
      summary: 'Cancel a pending invitation',
      params: idParamSchema,
      response: { 200: invitationDeleteResponse },
    },
    preHandler: [requireAbility('delete', 'Invitation')],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        const organizationId = request.organizationId!

        const invitation = await prisma.invitation.findFirst({
          where: { id, organizationId, status: 'pending' },
        })

        if (!invitation) throw new InvitationNotFoundError(id)

        await prisma.invitation.update({
          where: { id },
          data: { status: 'canceled' },
        })

        auditDelete({
          request,
          entityType: 'Invitation',
          entityId: id,
          before: { email: invitation.email, role: invitation.role },
        })

        return reply.send({ success: true, data: { id } })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
