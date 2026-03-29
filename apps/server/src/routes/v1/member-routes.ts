import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@repo/db'
import {
  container,
  type CacheService,
  UpdateMemberRole,
  DeactivateMember,
  LastOwnerError,
  MemberNotFoundError,
  RoleHierarchyError,
  SelfRemovalError,
} from '@repo/core'
import type { Role } from '@repo/auth/roles'
import { idParamSchema } from '../../schemas/client.schemas.js'
import {
  changeMemberRoleBodySchema,
  listMembersQuerySchema,
} from '../../schemas/member.schemas.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { auditDelete, auditUpdate } from '../../services/audit-logger.js'

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

function handleMemberError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof MemberNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof RoleHierarchyError) {
    return reply.status(403).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof SelfRemovalError || error instanceof LastOwnerError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

export async function memberRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // GET /api/v1/members — list active members
  app.get(
    '/api/v1/members',
    { preHandler: [requireAbility('read', 'Member')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { cursor, limit } = listMembersQuerySchema.parse(request.query)
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
    }
  )

  // PUT /api/v1/members/:id/role — change member role
  app.put(
    '/api/v1/members/:id/role',
    { preHandler: [requireAbility('update', 'Member')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params)
        const { role: newRole } = changeMemberRoleBodySchema.parse(request.body)
        const organizationId = request.organizationId!
        const callerRole = request.role! as Role
        const callerUserId = request.user!.id

        const updateMemberRole = container.resolve(UpdateMemberRole)
        const before = await prisma.member.findFirst({
          where: { id, organizationId, active: true },
          select: { role: true },
        })

        const updated = await updateMemberRole.execute({
          id,
          organizationId,
          callerUserId,
          callerRole,
          newRole,
        })

        auditUpdate({
          request,
          entityType: 'Member',
          entityId: id,
          before: { role: before?.role },
          after: { role: newRole },
        })

        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${organizationId}:members`)
        }

        return reply.send({ success: true, data: updated })
      } catch (error) {
        return handleMemberError(error, reply)
      }
    }
  )

  // DELETE /api/v1/members/:id — soft delete (active: false)
  app.delete(
    '/api/v1/members/:id',
    { preHandler: [requireAbility('delete', 'Member')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params)
        const organizationId = request.organizationId!
        const callerRole = request.role! as Role
        const callerUserId = request.user!.id

        const before = await prisma.member.findFirst({
          where: { id, organizationId, active: true },
          select: { role: true, userId: true },
        })

        const deactivateMember = container.resolve(DeactivateMember)
        await deactivateMember.execute({
          id,
          organizationId,
          callerUserId,
          callerRole,
        })

        auditDelete({
          request,
          entityType: 'Member',
          entityId: id,
          before: { role: before?.role, userId: before?.userId },
        })

        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${organizationId}:members`)
        }

        return reply.send({ success: true, data: { id } })
      } catch (error) {
        return handleMemberError(error, reply)
      }
    }
  )
}
