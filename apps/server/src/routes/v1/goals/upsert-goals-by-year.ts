import { container, UpsertGoalsByYear } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import {
  goalYearParamSchema,
  goalsUpsertResponse,
  upsertGoalsByYearBodySchema,
} from './_schemas.js'

export function upsertGoalsByYearRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/goals/:year',
    schema: {
      operationId: 'upsertGoalsByYear',
      tags: ['Goals'],
      summary: 'Upsert yearly goals in bulk (12 months × 2 boardTypes)',
      params: goalYearParamSchema,
      body: upsertGoalsByYearBodySchema,
      response: { 200: goalsUpsertResponse },
    },
    preHandler: [requireAbility('update', 'Goal')],
    handler: async (request, reply) => {
      const { year } = request.params
      const { entries } = request.body
      const useCase = container.resolve(UpsertGoalsByYear)
      await useCase.execute({
        organizationId: request.organizationId!,
        year,
        entries,
      })
      return reply.send({
        success: true,
        data: { count: entries.length },
      })
    },
  })
}
