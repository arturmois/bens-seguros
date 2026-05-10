import type { Auth } from '@repo/auth'
import { container, GetPublicInvitation } from '@repo/core'
import { RATE_LIMITS } from '@repo/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../handle-domain-error.js'
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
      const useCase = container.resolve(GetPublicInvitation)
      try {
        const [view, currentSession] = await Promise.all([
          useCase.execute(id),
          readCurrentSession({
            auth,
            headers: buildSessionHeaders(request),
            logger: request.log,
          }),
        ])
        return reply.send({
          success: true,
          data: {
            id: view.id,
            email: view.email,
            role: view.role,
            status: view.status,
            expiresAt: view.expiresAt,
            organizationName: view.organizationName,
            inviterName: view.inviterName,
            hasAccount: view.hasAccount,
            currentSession,
          },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
