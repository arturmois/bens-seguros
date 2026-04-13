import {
  ApproveCommissionAdmin,
  commissionApprovedEmail,
  container,
} from '@repo/core'
import { prismaAdmin as prisma } from '@repo/db'
import { env } from '@repo/env'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditApprove } from '../../../services/audit-logger.js'
import { enqueueNotification } from '../../../services/notification-enqueuer.js'
import { handleDomainError } from '../handle-domain-error.js'
import { commissionDetailResponse, commissionIdParam } from './_schemas.js'

export async function approveAdminRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/commissions/:id/approve-admin',
    schema: {
      tags: ['Commissions'],
      summary: 'Approve commission (admin step)',
      operationId: 'approveCommissionAdmin',
      params: commissionIdParam,
      response: { 200: commissionDetailResponse },
    },
    preHandler: [requireAbility('approve', 'Commission')],
    async handler(request, reply) {
      const { id } = request.params
      const useCase = container.resolve(ApproveCommissionAdmin)
      try {
        const commission = await useCase.execute(
          id,
          request.organizationId!,
          request.user!.id
        )
        auditApprove({
          request,
          entityType: 'Commission',
          entityId: id,
          after: { status: commission.status },
        })

        // Notify salesperson about approval
        if (commission.salespersonId) {
          const salesperson = await prisma.user.findUnique({
            where: { id: commission.salespersonId },
          })
          if (salesperson) {
            const frontendUrl = env.FRONTEND_URL
            const valueFormatted = (
              commission.commissionValueInCents / 100
            ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            enqueueNotification({
              notification: {
                organizationId: request.organizationId!,
                userId: commission.salespersonId,
                type: 'COMMISSION_APPROVED',
                title: 'Comissão aprovada',
                body: `Comissão de ${valueFormatted} aprovada`,
                entityType: 'Commission',
                entityId: commission.id,
              },
              email: salesperson.email
                ? {
                    to: salesperson.email,
                    subject: 'Sua comissão foi aprovada',
                    html: commissionApprovedEmail({
                      userName: salesperson.name,
                      policyNumber: String(commission.policyNumber ?? 'N/A'),
                      value: valueFormatted,
                      approvedBy: request.user!.name ?? 'Admin',
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
