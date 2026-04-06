import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { Auth } from '@repo/auth'
import { RATE_LIMITS } from '@repo/shared'
import { prisma } from '@repo/db'
import {
  idParamSchema,
  acceptInvitationBodySchema,
  acceptInvitationResponse,
} from './_schemas.js'
import { errorResponse } from '../../_shared/response.schema.js'

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

function buildOriginHeaders(request: FastifyRequest): Headers {
  const headers = new Headers()
  headers.set(
    'origin',
    request.headers.origin ?? request.headers.referer ?? 'http://localhost:3000'
  )
  const cookieHeader = request.headers.cookie
  if (cookieHeader) {
    headers.set('cookie', cookieHeader)
  }
  return headers
}

export function acceptInvitationRoute(app: FastifyInstance, auth: Auth) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/invitations/:id/accept',
    schema: {
      operationId: 'acceptInvitation',
      tags: ['Invitations'],
      summary: 'Accept invitation (register or login)',
      params: idParamSchema,
      body: acceptInvitationBodySchema,
      response: {
        200: acceptInvitationResponse,
        400: errorResponse,
        401: errorResponse,
        404: errorResponse,
        409: errorResponse,
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

      // 1. Validate invitation
      const invitation = await prisma.invitation.findUnique({
        where: { id },
      })

      if (!invitation) {
        return errorReply(
          reply,
          404,
          'INVITATION_NOT_FOUND',
          'Convite não encontrado'
        )
      }

      if (invitation.status === 'accepted') {
        return errorReply(
          reply,
          400,
          'INVITATION_ALREADY_ACCEPTED',
          'Este convite já foi aceito'
        )
      }

      if (invitation.status === 'canceled') {
        return errorReply(
          reply,
          404,
          'INVITATION_NOT_FOUND',
          'Convite não encontrado'
        )
      }

      if (invitation.expiresAt < new Date()) {
        return errorReply(
          reply,
          400,
          'INVITATION_EXPIRED',
          'Este convite expirou'
        )
      }

      // 2. Build request headers for Better Auth API calls
      const authHeaders = buildOriginHeaders(request)

      // 3. Register or Login
      let userId: string

      if (body.mode === 'register') {
        try {
          const signUpResult = await auth.api.signUpEmail({
            body: {
              email: invitation.email,
              password: body.password,
              name: body.name,
            },
            headers: authHeaders,
            returnHeaders: true,
          })

          userId = signUpResult.response.user.id

          // Mark email as verified (accepting an invitation = implicit verification)
          await prisma.user.update({
            where: { id: userId },
            data: { emailVerified: true },
          })

          // With requireEmailVerification, signUp does NOT create a session.
          // Now that email is verified, sign in to establish the session.
          const signInResult = await auth.api.signInEmail({
            body: {
              email: invitation.email,
              password: body.password,
            },
            headers: authHeaders,
            returnHeaders: true,
          })

          const signInCookies = signInResult.headers.getSetCookie()
          for (const cookie of signInCookies) {
            reply.header('set-cookie', cookie)
          }
          // Forward all cookies as a single header for subsequent auth API calls
          authHeaders.set('cookie', signInCookies.join('; '))
        } catch {
          return errorReply(
            reply,
            422,
            'REGISTRATION_FAILED',
            'Falha ao criar conta. O email pode já estar cadastrado.'
          )
        }
      } else {
        try {
          const signInResult = await auth.api.signInEmail({
            body: {
              email: invitation.email,
              password: body.password,
            },
            headers: authHeaders,
            returnHeaders: true,
          })

          userId = signInResult.response.user.id

          // Forward all session cookies from Better Auth sign-in response
          const loginCookies = signInResult.headers.getSetCookie()
          for (const cookie of loginCookies) {
            reply.header('set-cookie', cookie)
          }
          authHeaders.set('cookie', loginCookies.join('; '))
        } catch {
          return errorReply(
            reply,
            401,
            'INVALID_CREDENTIALS',
            'Senha incorreta'
          )
        }
      }

      // 4. Check if already a member
      const existingMember = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
      })

      if (existingMember) {
        await prisma.invitation.update({
          where: { id },
          data: { status: 'accepted' },
        })
        return errorReply(
          reply,
          409,
          'ALREADY_MEMBER',
          'Você já faz parte desta organização'
        )
      }

      // 5. Create member + mark invitation accepted in a transaction
      await prisma.$transaction([
        prisma.member.create({
          data: {
            organizationId: invitation.organizationId,
            userId,
            role: invitation.role,
          },
        }),
        prisma.invitation.update({
          where: { id },
          data: { status: 'accepted' },
        }),
      ])

      // 6. Set active organization in Better Auth session
      try {
        const setOrgResult = await auth.api.setActiveOrganization({
          body: { organizationId: invitation.organizationId },
          headers: authHeaders,
          returnHeaders: true,
        })
        for (const cookie of setOrgResult.headers.getSetCookie()) {
          reply.header('set-cookie', cookie)
        }
      } catch (err: unknown) {
        request.log.warn(
          { err },
          'Failed to set active organization after invitation accept'
        )
      }

      return reply.send({
        success: true,
        data: {
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      })
    },
  })
}
