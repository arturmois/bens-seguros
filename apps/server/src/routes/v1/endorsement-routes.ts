import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  CreateEndorsement,
  ListEndorsements,
  GetEndorsement,
  EndorsementNotFoundError,
} from '@repo/core'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  createEndorsementBodySchema,
  listEndorsementsQuerySchema,
} from '../../schemas/endorsement.schemas.js'
import { idParamSchema } from '../../schemas/client.schemas.js'

function handleEndorsementError(error: unknown, reply: FastifyReply) {
  if (error instanceof EndorsementNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function endorsementRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/endorsements',
    { preHandler: [requireAbility('create', 'Endorsement')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createEndorsementBodySchema.parse(request.body)
      const useCase = container.resolve(CreateEndorsement)
      try {
        const endorsement = await useCase.execute({
          organizationId: request.organizationId!,
          createdBy: request.user!.id,
          ...body,
        })
        return reply.status(201).send({ success: true, data: endorsement })
      } catch (error) {
        return handleEndorsementError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/endorsements',
    { preHandler: [requireAbility('read', 'Endorsement')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listEndorsementsQuerySchema.parse(request.query)
      const useCase = container.resolve(ListEndorsements)
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
    '/api/v1/endorsements/:id',
    { preHandler: [requireAbility('read', 'Endorsement')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParamSchema.parse(request.params)
      const useCase = container.resolve(GetEndorsement)
      try {
        const endorsement = await useCase.execute(id, request.organizationId!)
        return reply.send({ success: true, data: endorsement })
      } catch (error) {
        return handleEndorsementError(error, reply)
      }
    }
  )
}
