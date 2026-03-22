import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  IssuePolicy,
  ListPolicies,
  GetPolicy,
  CancelPolicy,
  PolicyNotFoundError,
  PolicyAlreadyCancelledError,
  PolicyNotIssuableError,
} from '@repo/core'
import { ProposalNotFoundError } from '@repo/core'
import { auditCreate, auditUpdate } from '../../services/audit-logger.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  issuePolicyBodySchema,
  listPoliciesQuerySchema,
  cancelPolicyBodySchema,
} from '../../schemas/policy.schemas.js'
import { idParamSchema } from '../../schemas/client.schemas.js'

function handlePolicyError(error: unknown, reply: FastifyReply) {
  if (error instanceof PolicyNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof ProposalNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof PolicyAlreadyCancelledError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof PolicyNotIssuableError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function policyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/policies',
    { preHandler: [requireAbility('create', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = issuePolicyBodySchema.parse(request.body)
      const useCase = container.resolve(IssuePolicy)
      try {
        const { coverageDetails, ...rest } = body
        const policy = await useCase.execute({
          organizationId: request.organizationId!,
          ...rest,
          coverageDetails: coverageDetails
            ? JSON.parse(JSON.stringify(coverageDetails))
            : undefined,
        })
        auditCreate({
          request,
          entityType: 'Policy',
          entityId: policy.id,
          after: policy,
        })
        return reply.status(201).send({ success: true, data: policy })
      } catch (error) {
        return handlePolicyError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/policies',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listPoliciesQuerySchema.parse(request.query)
      const useCase = container.resolve(ListPolicies)
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
    '/api/v1/policies/:id',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetPolicy)
      try {
        const policy = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: policy })
      } catch (error) {
        return handlePolicyError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/policies/:id/cancel',
    { preHandler: [requireAbility('delete', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const { reason } = cancelPolicyBodySchema.parse(request.body)
      const useCase = container.resolve(CancelPolicy)
      try {
        const policy = await useCase.execute(
          id,
          request.organizationId!,
          reason
        )
        auditUpdate({
          request,
          entityType: 'Policy',
          entityId: id,
          after: { status: 'CANCELLED' },
        })
        return reply.send({ success: true, data: policy })
      } catch (error) {
        return handlePolicyError(error, reply)
      }
    }
  )
}
