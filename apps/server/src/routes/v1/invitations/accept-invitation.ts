import type { Auth } from '@repo/auth'
import {
  AcceptInvitation,
  container,
  type InvitationRepository,
} from '@repo/core'
import { RATE_LIMITS } from '@repo/shared'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  applyActiveOrg,
  buildOriginHeaders,
  InviteAuthError,
  type AuthResult,
} from './_better-auth-helpers.js'
import { authenticateForInvitation } from './_invitation-auth.js'
import {
  acceptInvitationBodySchema,
  acceptInvitationResponse,
  idParamSchema,
} from './_schemas.js'

function errorReply(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string
) {
  return reply.status(status).send({
    success: false,
    error: { code, message },
  })
}

function applyCookies(reply: FastifyReply, cookies: readonly string[]): void {
  for (const cookie of cookies) reply.header('set-cookie', cookie)
}

export function acceptInvitationRoute(app: FastifyInstance, auth: Auth) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/invitations/:id/accept',
    schema: {
      operationId: 'acceptInvitation',
      tags: ['Invitations'],
      summary: 'Accept invitation (register, login, or current-session)',
      params: idParamSchema,
      body: acceptInvitationBodySchema,
      response: {
        200: acceptInvitationResponse,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        409: errorResponse,
        422: errorResponse,
      },
    },
    config: {
      rateLimit: {
        max: RATE_LIMITS.INVITATION_ACCEPT.max,
        timeWindow: `${String(RATE_LIMITS.INVITATION_ACCEPT.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) =>
          `invite-accept:${request.ip}`,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params
      const body = request.body

      const invitationRepo = container.resolve<InvitationRepository>(
        'InvitationRepository'
      )
      const invitation = await invitationRepo.findById(id)
      if (!invitation || invitation.status === 'canceled') {
        return errorReply(
          reply,
          404,
          'INVITATION_NOT_FOUND',
          'Convite não encontrado'
        )
      }

      const authHeaders = buildOriginHeaders(request)

      let authResult: AuthResult
      try {
        authResult = await authenticateForInvitation({
          body,
          invitationEmail: invitation.email,
          auth,
          headers: authHeaders,
          logger: request.log,
        })
      } catch (err) {
        if (err instanceof InviteAuthError) {
          return errorReply(reply, err.statusCode, err.code, err.message)
        }
        request.log.error({ err }, 'Unexpected error during invite auth')
        return errorReply(reply, 500, 'INTERNAL_ERROR', 'Erro inesperado')
      }

      applyCookies(reply, authResult.cookies)
      if (authResult.cookies.length > 0) {
        authHeaders.set('cookie', authResult.cookies.join('; '))
      }

      let result: { organizationId: string; role: string }
      try {
        result = await container
          .resolve(AcceptInvitation)
          .execute({ invitationId: id, userId: authResult.userId })
      } catch (err) {
        return handleDomainError(err, reply)
      }

      const orgCookies = await applyActiveOrg({
        auth,
        organizationId: result.organizationId,
        headers: authHeaders,
        logger: request.log,
      })
      applyCookies(reply, orgCookies)

      return reply.send({
        success: true,
        data: {
          organizationId: result.organizationId,
          role: result.role,
        },
      })
    },
  })
}
