import { ClientPresenter, container, GetClient } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { clientDetailResponse, idParamSchema } from './_schemas.js'

export function getClientRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/clients/:id',
    schema: {
      tags: ['Clients'],
      summary: 'Get a client by ID',
      operationId: 'getClient',
      params: idParamSchema,
      response: { 200: clientDetailResponse },
    },
    preHandler: [requireAbility('read', 'Client')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetClient)
      try {
        const client = await useCase.execute(
          request.params.id,
          request.organizationId!
        )
        return reply.send({
          success: true,
          data: ClientPresenter.toDetail(client, {
            role: request.role!,
            userId: request.user!.id,
          }),
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
