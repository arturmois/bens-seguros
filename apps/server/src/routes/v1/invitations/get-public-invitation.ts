import { prisma } from '@repo/db'
import { RATE_LIMITS } from '@repo/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { idParamSchema, publicInvitationResponse } from './_schemas.js'

export function getPublicInvitationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/invitations/:id/public',
    schema: {
      operationId: 'getPublicInvitation',
      tags: ['Invitations'],
      summary: 'Get public invitation details (unauthenticated)',
      params: idParamSchema,
      response: {
        200: publicInvitationResponse,
        404: errorResponse,
      },
    },
    config: {
      rateLimit: {
        max: RATE_LIMITS.INVITATION_PUBLIC.max,
        timeWindow: `${String(RATE_LIMITS.INVITATION_PUBLIC.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) => `invite-pub:${request.ip}`,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params

      const invitation = await prisma.invitation.findUnique({
        where: { id },
        include: {
          organization: { select: { name: true } },
        },
      })

      if (!invitation) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INVITATION_NOT_FOUND',
            message: 'Convite não encontrado',
          },
        })
      }

      const inviter = await prisma.user.findUnique({
        where: { id: invitation.inviterId },
        select: { name: true },
      })

      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      })

      return reply.send({
        success: true,
        data: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          organizationName: invitation.organization.name,
          inviterName: inviter?.name ?? 'Um membro',
          hasAccount: !!existingUser,
        },
      })
    },
  })
}
