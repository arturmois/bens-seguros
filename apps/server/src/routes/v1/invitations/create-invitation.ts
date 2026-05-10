import { container, CreateInvitation } from '@repo/core'
import { RATE_LIMITS } from '@repo/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  createInvitationBodySchema,
  invitationDetailResponse,
} from './_schemas.js'

export function createInvitationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/invitations',
    schema: {
      operationId: 'createInvitation',
      tags: ['Invitations'],
      summary: 'Create an invitation',
      body: createInvitationBodySchema,
      response: { 201: invitationDetailResponse },
    },
    preHandler: [requireAbility('create', 'Invitation')],
    config: {
      rateLimit: {
        max: RATE_LIMITS.INVITATION.max,
        timeWindow: `${String(RATE_LIMITS.INVITATION.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) =>
          `invite:${String(request.organizationId)}`,
      },
    },
    handler: async (request, reply) => {
      const { email, role } = request.body
      try {
        const useCase = container.resolve(CreateInvitation)
        const invitation = await useCase.execute({
          organizationId: request.organizationId!,
          email,
          role,
          callerRole: request.role!,
          inviterUserId: request.user!.id,
          inviterName: request.user!.name ?? 'Um membro',
        })
        auditCreate({
          request,
          entityType: 'Invitation',
          entityId: invitation.id,
          after: { email, role },
        })
        return reply.status(201).send({ success: true, data: invitation })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
