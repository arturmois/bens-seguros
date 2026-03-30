import { container, UpdateAssistanceStatus } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  idParamSchema,
  updateAssistanceStatusBodySchema,
  assistanceDetailResponse,
} from './_schemas.js'

export function updateAssistanceStatusRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/assistances/:id/status',
    schema: {
      operationId: 'updateAssistanceStatus',
      tags: ['Assistances'],
      summary: 'Update the status of an assistance request',
      params: idParamSchema,
      body: updateAssistanceStatusBodySchema,
      response: { 200: assistanceDetailResponse },
    },
    preHandler: [requireAbility('update', 'Assistance')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateAssistanceStatus)
      try {
        const assistance = await useCase.execute(
          request.params.id,
          request.organizationId!,
          request.body.status
        )
        auditUpdate({
          request,
          entityType: 'Assistance',
          entityId: request.params.id,
          after: { status: request.body.status },
        })
        return reply.send({ success: true, data: assistance })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
