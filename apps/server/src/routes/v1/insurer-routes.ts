import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@repo/core'
import {
  CreateInsurer,
  ListInsurers,
  InsurerAlreadyExistsError,
  type CacheService,
} from '@repo/core'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  createInsurerBodySchema,
  listInsurersQuerySchema,
} from '../../schemas/insurer.schemas.js'
import { auditCreate } from '../../services/audit-logger.js'

const INSURER_CACHE_TTL = 86400 // 24h

interface InsurerCacheData {
  items: unknown[]
  total: number
  nextCursor: string | null | undefined
}

function handleInsurerError(error: unknown, reply: FastifyReply) {
  if (error instanceof InsurerAlreadyExistsError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
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
        auditCreate({ request, entityType: 'Insurer', entityId: insurer.id })

        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${request.organizationId!}:insurers`)
        }

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
      const organizationId = request.organizationId!
      const cacheKey = `cache:${organizationId}:insurers`

      const cacheService = resolveCache()
      if (cacheService) {
        const cached = await cacheService.get<InsurerCacheData>(cacheKey)
        if (cached) {
          return reply.send({
            success: true,
            data: cached.items,
            meta: { total: cached.total, nextCursor: cached.nextCursor },
          })
        }
      }

      const useCase = container.resolve(ListInsurers)
      const { limit, cursor, ...filters } = query
      const result = await useCase.execute(
        { organizationId, ...filters },
        { limit, cursor }
      )

      if (cacheService) {
        await cacheService.set(
          cacheKey,
          {
            items: result.items,
            total: result.total,
            nextCursor: result.nextCursor,
          },
          INSURER_CACHE_TTL
        )
      }

      return reply.send({
        success: true,
        data: result.items,
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    }
  )
}
