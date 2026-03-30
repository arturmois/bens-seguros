import { container, CreateInsurer, type CacheService } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { createInsurerBodySchema, insurerDetailResponse } from './_schemas.js'

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function createInsurerRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/insurers',
    schema: {
      operationId: 'createInsurer',
      tags: ['Insurers'],
      summary: 'Create a new insurer',
      body: createInsurerBodySchema,
      response: { 201: insurerDetailResponse },
    },
    preHandler: [requireAbility('manage', 'all')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateInsurer)
      try {
        const insurer = await useCase.execute({
          organizationId: request.organizationId!,
          ...request.body,
        })
        auditCreate({ request, entityType: 'Insurer', entityId: insurer.id })

        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${request.organizationId!}:insurers`)
        }

        return reply.status(201).send({ success: true, data: insurer })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
