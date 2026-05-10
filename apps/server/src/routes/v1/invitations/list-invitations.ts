import { container, ListPendingInvitations } from '@repo/core'
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
      const useCase = container.resolve(ListPendingInvitations)
      const result = await useCase.execute({
        organizationId: request.organizationId!,
        limit,
        cursor,
      })
      return reply.send({
        success: true,
        data: result.items.map((item) => ({
          id: item.id,
          email: item.email,
          organizationId: item.organizationId,
          role: item.role,
          status: item.status,
          expiresAt: item.expiresAt,
          inviterId: item.inviterId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    },
  })
}
