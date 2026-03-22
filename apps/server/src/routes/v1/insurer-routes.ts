import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  CreateInsurer,
  ListInsurers,
  InsurerAlreadyExistsError,
} from '@repo/core'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  createInsurerBodySchema,
  listInsurersQuerySchema,
} from '../../schemas/insurer.schemas.js'

function handleInsurerError(error: unknown, reply: FastifyReply) {
  if (error instanceof InsurerAlreadyExistsError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function insurerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.post(
    '/api/v1/insurers',
    { preHandler: [requireAbility('manage', 'all')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = createInsurerBodySchema.parse(request.body)
      const useCase = container.resolve(CreateInsurer)
      try {
        const insurer = await useCase.execute({
          organizationId: request.organizationId!,
          ...body,
        })
        return reply.status(201).send({ success: true, data: insurer })
      } catch (error) {
        return handleInsurerError(error, reply)
      }
    }
  )

  app.get(
    '/api/v1/insurers',
    { preHandler: [requireAbility('read', 'Policy')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listInsurersQuerySchema.parse(request.query)
      const useCase = container.resolve(ListInsurers)
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
}
