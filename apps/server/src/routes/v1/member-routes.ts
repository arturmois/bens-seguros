import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ROLE_HIERARCHY, type Role } from '@repo/auth/roles'
import { ResendEmailProvider, invitationEmail } from '@repo/core/notification'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import { idParamSchema } from '../../schemas/client.schemas.js'
import {
  changeMemberRoleBodySchema,
  createInvitationBodySchema,
  listInvitationsQuerySchema,
  listMembersQuerySchema,
} from '../../schemas/member.schemas.js'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import {
  auditCreate,
  auditDelete,
  auditUpdate,
} from '../../services/audit-logger.js'
import {
  DuplicateInvitationError,
  InvitationNotFoundError,
  LastOwnerError,
  MemberNotFoundError,
  RoleHierarchyError,
  SelfRemovalError,
} from './member-errors.js'

function handleMemberError(error: unknown, reply: FastifyReply): FastifyReply {
  if (
    error instanceof MemberNotFoundError ||
    error instanceof InvitationNotFoundError
  ) {
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
  if (error instanceof SelfRemovalError || error instanceof LastOwnerError) {
    return reply.status(422).send({
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

export async function memberRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // GET /api/v1/members — list active members
  app.get(
    '/api/v1/members',
    { preHandler: [requireAbility('read', 'Member')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { cursor, limit } = listMembersQuerySchema.parse(request.query)
      const organizationId = request.organizationId!

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

      return reply.send({
        success: true,
        data,
        meta: {
          total,
          nextCursor: hasMore ? members[members.length - 1]?.id : null,
        },
      })
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
        const callerRole = request.role!

        const member = await prisma.member.findFirst({
          where: { id, organizationId, active: true },
        })

        if (!member) throw new MemberNotFoundError(id)
        if (member.userId === request.user!.id) throw new SelfRemovalError()

        assertCanManageRole(callerRole, toRole(member.role))
        assertCanManageRole(callerRole, toRole(newRole))

        if (member.role === 'OWNER') {
          const ownerCount = await prisma.member.count({
            where: { organizationId, role: 'OWNER', active: true },
          })
          if (ownerCount <= 1) throw new LastOwnerError()
        }

        const updated = await prisma.member.update({
          where: { id },
          data: { role: newRole },
        })

        auditUpdate({
          request,
          entityType: 'Member',
          entityId: id,
          before: { role: member.role },
          after: { role: newRole },
        })

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
        const callerRole = request.role!

        const member = await prisma.member.findFirst({
          where: { id, organizationId, active: true },
        })

        if (!member) throw new MemberNotFoundError(id)
        if (member.userId === request.user!.id) throw new SelfRemovalError()
        assertCanManageRole(callerRole, toRole(member.role))

        if (member.role === 'OWNER') {
          const ownerCount = await prisma.member.count({
            where: { organizationId, role: 'OWNER', active: true },
          })
          if (ownerCount <= 1) throw new LastOwnerError()
        }

        await prisma.member.update({
          where: { id },
          data: { active: false },
        })

        auditDelete({
          request,
          entityType: 'Member',
          entityId: id,
          before: { role: member.role, userId: member.userId },
        })

        return reply.send({ success: true, data: { id } })
      } catch (error) {
        return handleMemberError(error, reply)
      }
    }
  )

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
    { preHandler: [requireAbility('create', 'Invitation')] },
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
            organizationName: org?.name ?? 'Organizacao',
            role,
            frontendUrl: env.FRONTEND_URL,
            invitationId: invitation.id,
          })

          await emailProvider.send({
            to: email,
            subject: `Convite para ${org?.name ?? 'Organizacao'}`,
            html,
          })
        }

        auditCreate({
          request,
          entityType: 'Invitation',
          entityId: invitation.id,
          after: { email, role },
        })

        return reply.status(201).send({ success: true, data: invitation })
      } catch (error) {
        return handleMemberError(error, reply)
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
        return handleMemberError(error, reply)
      }
    }
  )
}
