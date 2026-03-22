import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  CreateAssistance,
  ListAssistances,
  GetAssistance,
  UpdateAssistanceStatus,
  AssistanceNotFoundError,
  InvalidAssistanceStatusTransitionError,
} from '@repo/core'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  createAssistanceBodySchema,
  updateAssistanceStatusBodySchema,
  listAssistancesQuerySchema,
} from '../../schemas/assistance.schemas.js'
import { idParamSchema } from '../../schemas/client.schemas.js'
import { auditCreate, auditUpdate } from '../../services/audit-logger.js'

function handleAssistanceError(error: unknown, reply: FastifyReply) {
  if (error instanceof AssistanceNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof InvalidAssistanceStatusTransitionError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function assistanceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/assistances',
    { preHandler: [requireAbility('create', 'Assistance')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createAssistanceBodySchema.parse(request.body)
      const useCase = container.resolve(CreateAssistance)
      try {
        const assistance = await useCase.execute({
          organizationId: request.organizationId!,
          ...body,
        })
        auditCreate({
          request,
          entityType: 'Assistance',
          entityId: assistance.id,
        })
        return reply.status(201).send({ success: true, data: assistance })
      } catch (error) {
        return handleAssistanceError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/assistances',
    { preHandler: [requireAbility('read', 'Assistance')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listAssistancesQuerySchema.parse(request.query)
      const useCase = container.resolve(ListAssistances)
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
    '/api/v1/assistances/:id',
    { preHandler: [requireAbility('read', 'Assistance')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetAssistance)
      try {
        const assistance = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: assistance })
      } catch (error) {
        return handleAssistanceError(error, reply)
      }
    }
  )

  app.post(
    '/api/v1/assistances/:id/status',
    { preHandler: [requireAbility('update', 'Assistance')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const { status } = updateAssistanceStatusBodySchema.parse(request.body)
      const useCase = container.resolve(UpdateAssistanceStatus)
      try {
        const assistance = await useCase.execute(
          id,
          request.organizationId!,
          status
        )
        auditUpdate({
          request,
          entityType: 'Assistance',
          entityId: id,
          after: { status },
        })
        return reply.send({ success: true, data: assistance })
      } catch (error) {
        return handleAssistanceError(error, reply)
      }
    }
  )
}
