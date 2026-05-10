import { container, ListInsurers } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { insurerListResponse, listInsurersQuerySchema } from './_schemas.js'

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
      const { active, search, cursor, limit, sortBy, sortOrder } = request.query
      const useCase = container.resolve(ListInsurers)
      const result = await useCase.execute(
        { organizationId: request.organizationId!, active, search },
        { limit, cursor, sortBy, sortOrder }
      )
      return reply.send({
        success: true,
        data: result.items,
        meta: { nextCursor: result.nextCursor },
      })
    },
  })
}
