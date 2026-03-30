import { CreateClaim, claimOpenedEmail, container } from '@repo/core'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { enqueueNotifications } from '../../../services/notification-enqueuer.js'
import { handleDomainError } from '../handle-domain-error.js'
import { createClaimBodySchema } from './_schemas.js'

export function createClaimRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/claims',
    schema: {
      tags: ['Claims'],
      summary: 'Create a new claim',
      operationId: 'createClaim',
      body: createClaimBodySchema,
    },
    preHandler: [requireAbility('create', 'Claim')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateClaim)
      try {
        const claim = await useCase.execute({
          organizationId: request.organizationId!,
          ...request.body,
        })

        // Notify ADMIN + MANAGER about new claim
        const managers = await prisma.member.findMany({
          where: {
            organizationId: request.organizationId!,
            role: { in: ['ADMIN', 'MANAGER', 'OWNER'] },
          },
          include: { user: true },
        })
        const frontendUrl = env.FRONTEND_URL
        const notifItems = managers
          .filter((m) => m.userId !== request.user!.id)
          .map((m) => ({
            notification: {
              organizationId: request.organizationId!,
              userId: m.userId,
              type: 'CLAIM_OPENED',
              title: 'Novo sinistro aberto',
              body: `Sinistro #${String(claim.claimNumber)} aberto`,
              entityType: 'Claim',
              entityId: claim.id,
            },
            email: m.user.email
              ? {
                  to: m.user.email,
                  subject: `Novo sinistro #${String(claim.claimNumber)}`,
                  html: claimOpenedEmail({
                    userName: m.user.name,
                    claimNumber: String(claim.claimNumber),
                    clientName: 'N/A',
                    priority: String(claim.priority ?? 'NORMAL'),
                    frontendUrl,
                  }),
                }
              : undefined,
          }))
        if (notifItems.length > 0) {
          enqueueNotifications(notifItems).catch((err: unknown) => {
            request.log.error({ err }, 'Failed to enqueue claim notifications')
          })
        }

        auditCreate({
          request,
          entityType: 'Claim',
          entityId: claim.id,
          after: claim,
        })
        return reply.status(201).send({ success: true, data: claim })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
