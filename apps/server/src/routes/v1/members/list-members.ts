import { container, ListMembers } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { listMembersQuerySchema, memberListResponse } from './_schemas.js'

export function listMembersRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/members',
    schema: {
      operationId: 'listMembers',
      tags: ['Members'],
      summary: 'List organization members',
      querystring: listMembersQuerySchema,
      response: { 200: memberListResponse },
    },
    preHandler: [requireAbility('read', 'Member')],
    handler: async (request, reply) => {
      const { cursor, limit } = request.query
      const useCase = container.resolve(ListMembers)
      const result = await useCase.execute({
        organizationId: request.organizationId!,
        limit,
        cursor,
      })
      return reply.send({
        success: true,
        data: result.items.map((item) => ({
          id: item.id,
          userId: item.userId,
          name: item.name,
          email: item.email,
          role: item.role,
          active: item.active,
          createdAt: item.createdAt,
        })),
        meta: { total: result.total, nextCursor: result.nextCursor },
      })
    },
  })
}
