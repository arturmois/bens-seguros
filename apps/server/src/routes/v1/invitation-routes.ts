import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { RATE_LIMITS } from '@repo/shared'
import { ResendEmailProvider, invitationEmail } from '@repo/core/notification'
import { container, type CacheService } from '@repo/core'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import { ROLE_HIERARCHY, type Role } from '@repo/auth/roles'
import { idParamSchema } from '../../schemas/client.schemas.js'
import {
  createInvitationBodySchema,
  listInvitationsQuerySchema,
} from '../../schemas/member.schemas.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { auditCreate, auditDelete } from '../../services/audit-logger.js'
import {
  DuplicateInvitationError,
  InvitationNotFoundError,
  RoleHierarchyError,
} from '@repo/core'

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

function handleInvitationError(
  error: unknown,
  reply: FastifyReply
): FastifyReply {
  if (error instanceof InvitationNotFoundError) {
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
  if (error instanceof DuplicateInvitationError) {
    return reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}

function toRole(value: string): Role {
  if (value in ROLE_HIERARCHY) return value as Role
  throw new RoleHierarchyError()
}

function assertCanManageRole(callerRole: Role, targetRole: Role): void {
  if (ROLE_HIERARCHY[callerRole] <= ROLE_HIERARCHY[targetRole]) {
    throw new RoleHierarchyError()
  }
}

export async function invitationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // GET /api/v1/invitations — list pending invitations
  app.get(
    '/api/v1/invitations',
    { preHandler: [requireAbility('read', 'Invitation')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { cursor, limit } = listInvitationsQuerySchema.parse(request.query)
      const organizationId = request.organizationId!
      const now = new Date()

      const where = {
        organizationId,
        status: 'pending',
        expiresAt: { gt: now },
        ...(cursor ? { id: { gt: cursor } } : {}),
      } as const

      const [invitations, total] = await Promise.all([
        prisma.invitation.findMany({
          where,
          orderBy: { id: 'asc' as const },
          take: limit + 1,
        }),
        prisma.invitation.count({
          where: { organizationId, status: 'pending', expiresAt: { gt: now } },
        }),
      ])

      const hasMore = invitations.length > limit
      if (hasMore) invitations.pop()

      return reply.send({
        success: true,
        data: invitations,
        meta: {
          total,
          nextCursor: hasMore ? invitations[invitations.length - 1]?.id : null,
        },
      })
    }
  )

  // POST /api/v1/invitations — create invitation + send email
  app.post(
    '/api/v1/invitations',
    {
      preHandler: [requireAbility('create', 'Invitation')],
      config: {
        rateLimit: {
          max: RATE_LIMITS.INVITATION.max,
          timeWindow: `${String(RATE_LIMITS.INVITATION.windowSeconds)} seconds`,
          keyGenerator: (request: FastifyRequest) =>
            `invite:${String(request.organizationId)}`,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, role } = createInvitationBodySchema.parse(request.body)
      const organizationId = request.organizationId!
      const callerRole = request.role!

      try {
        assertCanManageRole(callerRole, toRole(role))

        const existingMember = await prisma.member.findFirst({
          where: {
            organizationId,
            active: true,
            user: { email },
          },
        })
        if (existingMember) throw new DuplicateInvitationError(email)

        const existingInvitation = await prisma.invitation.findFirst({
          where: {
            organizationId,
            email,
            status: 'pending',
            expiresAt: { gt: new Date() },
          },
        })
        if (existingInvitation) throw new DuplicateInvitationError(email)

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        const invitation = await prisma.invitation.create({
          data: {
            organizationId,
            email,
            role,
            status: 'pending',
            expiresAt,
            invitedBy: request.user!.id,
          },
        })

        // Send invitation email via Resend
        if (env.RESEND_API_KEY) {
          const [org, inviter] = await Promise.all([
            prisma.organization.findUnique({
              where: { id: organizationId },
              select: { name: true },
            }),
            Promise.resolve(request.user!.name ?? 'Um membro'),
          ])

          const emailProvider = new ResendEmailProvider({
            apiKey: env.RESEND_API_KEY,
            fromAddress: env.RESEND_FROM_ADDRESS,
          })

          const html = invitationEmail({
            inviterName: inviter,
            organizationName: org?.name ?? 'Organização',
            role,
            frontendUrl: env.FRONTEND_URL,
            invitationId: invitation.id,
          })

          await emailProvider.send({
            to: email,
            subject: `Convite para ${org?.name ?? 'Organização'}`,
            html,
          })
        }

        auditCreate({
          request,
          entityType: 'Invitation',
          entityId: invitation.id,
          after: { email, role },
        })

        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${organizationId}:members`)
        }

        return reply.status(201).send({ success: true, data: invitation })
      } catch (error) {
        return handleInvitationError(error, reply)
      }
    }
  )

  // DELETE /api/v1/invitations/:id — revoke invitation
  app.delete(
    '/api/v1/invitations/:id',
    { preHandler: [requireAbility('delete', 'Invitation')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = idParamSchema.parse(request.params)
        const organizationId = request.organizationId!

        const invitation = await prisma.invitation.findFirst({
          where: { id, organizationId, status: 'pending' },
        })

        if (!invitation) throw new InvitationNotFoundError(id)

        await prisma.invitation.update({
          where: { id },
          data: { status: 'canceled' },
        })

        auditDelete({
          request,
          entityType: 'Invitation',
          entityId: id,
          before: { email: invitation.email, role: invitation.role },
        })

        return reply.send({ success: true, data: { id } })
      } catch (error) {
        return handleInvitationError(error, reply)
      }
    }
  )
}
