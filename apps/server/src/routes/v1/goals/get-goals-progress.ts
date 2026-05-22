import { container, GetGoalsProgressByYear } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { goalsProgressQuerySchema, goalsProgressResponse } from './_schemas.js'

export function getGoalsProgressRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/goals/progress',
    schema: {
      operationId: 'getGoalsProgress',
      tags: ['Goals'],
      summary:
        'Get yearly goals progress (target + realized) by month and boardType',
      querystring: goalsProgressQuerySchema,
      response: { 200: goalsProgressResponse },
    },
    preHandler: [requireAbility('read', 'Goal')],
    handler: async (request, reply) => {
      const { year } = request.query
      const useCase = container.resolve(GetGoalsProgressByYear)
      const result = await useCase.execute({
        organizationId: request.organizationId!,
        year,
      })
      return reply.send({
        success: true,
        data: {
          year: result.year,
          entries: result.entries.map((e) => ({
            month: e.month,
            boardType: e.boardType,
            targetPremiumCents: e.targetPremiumCents,
            realizedPremiumCents: e.realizedPremiumCents,
          })),
        },
      })
    },
  })
}
