import {
  ApproveCommissionAdmin,
  ApproveCommissionCommercial,
  commissionApprovedEmail,
  commissionRejectedEmail,
  container,
  ExportCommissionsCsv,
  GetCommission,
  ListCommissions,
  PayCommission,
  RejectCommission,
  ReverseCommission,
} from '@repo/core'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { idParamSchema } from '../../schemas/client.schemas.js'
import {
  listCommissionsQuerySchema,
  rejectCommissionBodySchema,
} from '../../schemas/commission.schemas.js'
import {
  auditApprove,
  auditReject,
  auditUpdate,
} from '../../services/audit-logger.js'
import { enqueueNotification } from '../../services/notification-enqueuer.js'
import { handleDomainError } from './handle-domain-error.js'

export async function commissionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // IMPORTANT: export route must be registered BEFORE /:id to avoid route conflict
  app.get(
    '/api/v1/commissions/export',
    { preHandler: [requireAbility('read', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { status, salespersonId, policyId, search, dateFrom, dateTo } =
        listCommissionsQuerySchema.parse(request.query)
      const useCase = container.resolve(ExportCommissionsCsv)
      const stream = useCase.generateCsvRows({
        organizationId: request.organizationId!,
        status,
        salespersonId,
        policyId,
        search,
        dateFrom,
        dateTo,
      })

      reply.raw.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="comissoes.csv"',
        'Transfer-Encoding': 'chunked',
      })

      for await (const chunk of stream) {
        reply.raw.write(chunk)
      }

      reply.raw.end()
      return reply
    }
  )

  app.get(
    '/api/v1/commissions',
    { preHandler: [requireAbility('read', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listCommissionsQuerySchema.parse(request.query)
      const useCase = container.resolve(ListCommissions)
      const { limit, cursor, ...filters } = query
      const result = await useCase.execute(
        { organizationId: request.organizationId!, ...filters },
        { limit, cursor }
      )
      return reply.send({
        success: true,
        data: result.items,
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    }
  )

  app.get(
    '/api/v1/commissions/:id',
    { preHandler: [requireAbility('read', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetCommission)
      try {
        const commission = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/commissions/:id/approve-commercial',
    { preHandler: [requireAbility('approve', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(ApproveCommissionCommercial)
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
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/commissions/:id/approve-admin',
    { preHandler: [requireAbility('approve', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
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
    }
  )

  app.post(
    '/api/v1/commissions/:id/reject',
    { preHandler: [requireAbility('approve', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const { reason } = rejectCommissionBodySchema.parse(request.body)
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
    }
  )

  app.post(
    '/api/v1/commissions/:id/pay',
    { preHandler: [requireAbility('manage', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(PayCommission)
      try {
        const commission = await useCase.execute(id, request.organizationId!)
        auditUpdate({
          request,
          entityType: 'Commission',
          entityId: id,
          after: { status: 'PAID' },
        })
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/commissions/:id/reverse',
    { preHandler: [requireAbility('manage', 'Commission')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(ReverseCommission)
      try {
        const result = await useCase.execute(id, request.organizationId!)
        auditUpdate({
          request,
          entityType: 'Commission',
          entityId: id,
          after: { status: 'REVERSED' },
        })
        return reply.status(201).send({ success: true, data: result })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    }
  )
}
