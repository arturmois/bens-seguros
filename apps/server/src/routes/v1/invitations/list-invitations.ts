import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import {
  invitationListResponse,
  listInvitationsQuerySchema,
} from './_schemas.js'

export function listInvitationsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/invitations',
    schema: {
      operationId: 'listInvitations',
      tags: ['Invitations'],
      summary: 'List pending invitations',
      querystring: listInvitationsQuerySchema,
      response: { 200: invitationListResponse },
    },
    preHandler: [requireAbility('read', 'Invitation')],
    handler: async (request, reply) => {
      const { cursor, limit } = request.query
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
    },
  })
}
