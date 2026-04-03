import { container, type CacheService, ListInsurers } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listInsurersQuerySchema, insurerListResponse } from './_schemas.js'

const INSURER_CACHE_TTL = 86400 // 24h

interface InsurerCacheData {
  items: {
    id: string
    organizationId: string
    name: string
    code: string | null
    active: boolean
    createdAt: Date
    updatedAt: Date
  }[]
  nextCursor: string | null | undefined
}

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function listInsurersRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/insurers',
    schema: {
      operationId: 'listInsurers',
      tags: ['Insurers'],
      summary: 'List insurers with cursor pagination and caching',
      querystring: listInsurersQuerySchema,
      response: { 200: insurerListResponse },
    },
    preHandler: [requireAbility('read', 'Insurer')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId!
      const { active, search, cursor, limit } = request.query
      const canUseCache =
        active === undefined &&
        search === undefined &&
        cursor === undefined &&
        limit === 20
      const cacheKey = `cache:${organizationId}:insurers`

      const cacheService = canUseCache ? resolveCache() : null
      if (cacheService) {
        const cached = await cacheService.get<InsurerCacheData>(cacheKey)
        if (cached) {
          return reply.send({
            success: true,
            data: cached.items,
            meta: { nextCursor: cached.nextCursor },
          })
        }
      }

      const useCase = container.resolve(ListInsurers)
      const result = await useCase.execute(
        { organizationId, active, search },
        { limit, cursor }
      )

      if (cacheService) {
        await cacheService.set(
          cacheKey,
          {
            items: result.items,
            nextCursor: result.nextCursor,
          },
          INSURER_CACHE_TTL
        )
      }

      return reply.send({
        success: true,
        data: result.items,
        meta: { nextCursor: result.nextCursor },
      })
    },
  })
}
