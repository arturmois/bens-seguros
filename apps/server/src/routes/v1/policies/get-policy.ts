import { container, GetPolicy } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { idParam } from './_schemas.js'

export function getPolicyRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/policies/:id',
    schema: {
      tags: ['Policies'],
      summary: 'Get a single policy by ID',
      operationId: 'getPolicy',
      params: idParam,
    },
    preHandler: [requireAbility('read', 'Policy')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetPolicy)
      try {
        const policy = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({ success: true, data: policy })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
