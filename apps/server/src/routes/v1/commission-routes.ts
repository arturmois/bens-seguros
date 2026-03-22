import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  GetCommission,
  ListCommissions,
  ApproveCommissionCommercial,
  ApproveCommissionAdmin,
  RejectCommission,
  PayCommission,
  ReverseCommission,
  ExportCommissionsCsv,
  CommissionNotFoundError,
  InvalidCommissionTransitionError,
  CommissionNotPaidError,
  CommissionAlreadyPaidError,
} from '@repo/core'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  listCommissionsQuerySchema,
  rejectCommissionBodySchema,
} from '../../schemas/commission.schemas.js'
import { idParamSchema } from '../../schemas/client.schemas.js'

function handleCommissionError(
  error: unknown,
  reply: FastifyReply
): FastifyReply {
  if (error instanceof CommissionNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof InvalidCommissionTransitionError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof CommissionNotPaidError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof CommissionAlreadyPaidError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

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
      const csv = await useCase.execute({
        organizationId: request.organizationId!,
        status,
        salespersonId,
        policyId,
        search,
        dateFrom,
        dateTo,
      })
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="comissoes.csv"')
        .send(csv)
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
        return handleCommissionError(error, reply)
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
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleCommissionError(error, reply)
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
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleCommissionError(error, reply)
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
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleCommissionError(error, reply)
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
        return reply.send({ success: true, data: commission })
      } catch (error) {
        return handleCommissionError(error, reply)
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
        return reply.status(201).send({ success: true, data: result })
      } catch (error) {
        return handleCommissionError(error, reply)
      }
    }
  )
}
