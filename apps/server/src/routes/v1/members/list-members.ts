import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '@repo/db'
import { container, type CacheService } from '@repo/core'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listMembersQuerySchema } from './_schemas.js'

const MEMBER_CACHE_TTL = 3600 // 1h

interface MemberListCache {
  readonly data: {
    id: string
    userId: string
    name: string | null
    email: string
    role: string
    active: boolean
    createdAt: string
  }[]
  readonly meta: { total: number; nextCursor: string | null }
}

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function listMembersRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/members',
    schema: {
      operationId: 'listMembers',
      tags: ['Members'],
      summary: 'List organization members',
      querystring: listMembersQuerySchema,
    },
    preHandler: [requireAbility('read', 'Member')],
    handler: async (request, reply) => {
      const { cursor, limit } = request.query
      const organizationId = request.organizationId!
      const cacheKey = `cache:${organizationId}:members`

      const cacheService = resolveCache()
      if (cacheService && !cursor) {
        const cached = await cacheService.get<MemberListCache>(cacheKey)
        if (cached) {
          return reply.send({ success: true, ...cached })
        }
      }

      const where = {
        organizationId,
        active: true,
        ...(cursor ? { id: { gt: cursor } } : {}),
      } as const

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          include: { user: { select: { name: true, email: true } } },
          orderBy: { id: 'asc' as const },
          take: limit + 1,
        }),
        prisma.member.count({ where: { organizationId, active: true } }),
      ])

      const hasMore = members.length > limit
      if (hasMore) members.pop()

      const data = members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        active: m.active,
        createdAt: m.createdAt.toISOString(),
      }))

      const meta = {
        total,
        nextCursor: hasMore ? members[members.length - 1]?.id : null,
      }

      if (cacheService && !cursor) {
        await cacheService.set(cacheKey, { data, meta }, MEMBER_CACHE_TTL)
      }

      return reply.send({ success: true, data, meta })
    },
  })
}
