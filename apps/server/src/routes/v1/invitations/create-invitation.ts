import { ROLE_HIERARCHY, type Role } from '@repo/auth/roles'
import {
  DuplicateInvitationError,
  RoleHierarchyError,
  container,
  type CacheService,
} from '@repo/core'
import { ResendEmailProvider, invitationEmail } from '@repo/core/notification'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import { RATE_LIMITS } from '@repo/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  createInvitationBodySchema,
  invitationDetailResponse,
} from './_schemas.js'

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
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

export function createInvitationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/invitations',
    schema: {
      operationId: 'createInvitation',
      tags: ['Invitations'],
      summary: 'Create an invitation',
      body: createInvitationBodySchema,
      response: { 201: invitationDetailResponse },
    },
    preHandler: [requireAbility('create', 'Invitation')],
    config: {
      rateLimit: {
        max: RATE_LIMITS.INVITATION.max,
        timeWindow: `${String(RATE_LIMITS.INVITATION.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) =>
          `invite:${String(request.organizationId)}`,
      },
    },
    handler: async (request, reply) => {
      const { email, role } = request.body
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
            inviterId: request.user!.id,
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
        return handleDomainError(error, reply)
      }
    },
  })
}
