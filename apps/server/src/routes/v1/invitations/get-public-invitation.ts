import type { Auth } from '@repo/auth'
import { prisma } from '@repo/db'
import { RATE_LIMITS } from '@repo/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { readCurrentSession } from './_better-auth-helpers.js'
import { idParamSchema, publicInvitationResponse } from './_schemas.js'

function buildSessionHeaders(request: FastifyRequest): Headers {
  const headers = new Headers()
  const cookieHeader = request.headers.cookie
  if (cookieHeader) headers.set('cookie', cookieHeader)
  return headers
}

export function getPublicInvitationRoute(app: FastifyInstance, auth: Auth) {
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
      const [inviter, existingUser, currentSession] = await Promise.all([
        prisma.user.findUnique({
          where: { id: invitation.inviterId },
          select: { name: true },
        }),
        prisma.user.findUnique({
          where: { email: invitation.email },
          select: { id: true },
        }),
        readCurrentSession({
          auth,
          headers: buildSessionHeaders(request),
          logger: request.log,
        }),
      ])
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
          currentSession,
        },
      })
    },
  })
}
