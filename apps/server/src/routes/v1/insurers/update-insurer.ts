import { container, UpdateInsurer, type CacheService } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  idParamSchema,
  insurerDetailResponse,
  updateInsurerBodySchema,
} from './_schemas.js'

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function updateInsurerRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/insurers/:id',
    schema: {
      operationId: 'updateInsurer',
      tags: ['Insurers'],
      summary: 'Update an insurer',
      params: idParamSchema,
      body: updateInsurerBodySchema,
      response: { 200: insurerDetailResponse },
    },
    preHandler: [requireAbility('manage', 'Insurer')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateInsurer)
      try {
        const insurer = await useCase.execute({
          id: request.params.id,
          organizationId: request.organizationId!,
          ...request.body,
        })
        auditUpdate({
          request,
          entityType: 'Insurer',
          entityId: insurer.id,
          after: insurer,
        })
        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${request.organizationId!}:insurers`)
        }
        return reply.send({ success: true, data: insurer })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
