import {
  commissionRejectedEmail,
  container,
  RejectCommission,
} from '@repo/core'
import { prismaAdmin as prisma } from '@repo/db'
import { env } from '@repo/env'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditReject } from '../../../services/audit-logger.js'
import { enqueueNotification } from '../../../services/notification-enqueuer.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  commissionDetailResponse,
  commissionIdParam,
  rejectCommissionBody,
} from './_schemas.js'

export async function rejectCommissionRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/commissions/:id/reject',
    schema: {
      tags: ['Commissions'],
      summary: 'Reject commission with reason',
      operationId: 'rejectCommission',
      params: commissionIdParam,
      body: rejectCommissionBody,
      response: { 200: commissionDetailResponse },
    },
    preHandler: [requireAbility('approve', 'Commission')],
    async handler(request, reply) {
      const { id } = request.params
      const { reason } = request.body
      const useCase = container.resolve(RejectCommission)
      try {
        const commission = await useCase.execute({
          id,
          organizationId: request.organizationId!,
          userId: request.user!.id,
          reason,
        })
        auditReject({
          request,
          entityType: 'Commission',
          entityId: id,
          after: { status: commission.status, rejectionReason: reason },
        })

        // Notify salesperson about rejection
        if (commission.salespersonId) {
          const salesperson = await prisma.user.findUnique({
            where: { id: commission.salespersonId },
          })
          if (salesperson) {
            const frontendUrl = env.FRONTEND_URL
            enqueueNotification({
              notification: {
                organizationId: request.organizationId!,
                userId: commission.salespersonId,
                type: 'COMMISSION_REJECTED',
                title: 'Comissão rejeitada',
                body: `Comissão rejeitada: ${reason}`,
                entityType: 'Commission',
                entityId: commission.id,
              },
              email: salesperson.email
                ? {
                    to: salesperson.email,
                    subject: 'Sua comissão foi rejeitada',
                    html: commissionRejectedEmail({
                      userName: salesperson.name,
                      policyNumber: String(commission.policyNumber ?? 'N/A'),
                      reason,
                      rejectedBy: request.user!.name ?? 'Admin',
                      frontendUrl,
                    }),
                  }
                : undefined,
            }).catch((err: unknown) => {
              request.log.error(
                { err },
                'Failed to enqueue commission notification'
              )
            })
          }
        }

        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
