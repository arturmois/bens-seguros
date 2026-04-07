import { ClientPresenter, container, UpdateClient } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  clientDetailResponse,
  idParamSchema,
  updateClientBodySchema,
} from './_schemas.js'

export function updateClientRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/clients/:id',
    schema: {
      tags: ['Clients'],
      summary: 'Update a client',
      operationId: 'updateClient',
      params: idParamSchema,
      body: updateClientBodySchema,
      response: { 200: clientDetailResponse },
    },
    preHandler: [requireAbility('update', 'Client')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateClient)
      try {
        const updated = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body
        )
        auditUpdate({
          request,
          entityType: 'Client',
          entityId: request.params.id,
          after: updated,
        })
        return reply.send({
          success: true,
          data: ClientPresenter.toDetail(updated, {
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
