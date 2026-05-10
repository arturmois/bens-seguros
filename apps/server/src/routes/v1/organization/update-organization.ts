import { container, UpdateOrganization } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  organizationDetailResponse,
  updateOrganizationSchema,
} from './_schemas.js'

export function updateOrganizationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/organization',
    schema: {
      operationId: 'updateOrganization',
      tags: ['Organization'],
      summary: 'Update organization name and slug',
      body: updateOrganizationSchema,
      response: { 200: organizationDetailResponse, 409: errorResponse },
    },
    preHandler: [requireAbility('manage', 'Organization')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId!
      const body = request.body
      const useCase = container.resolve(UpdateOrganization)
      try {
        const { view, before } = await useCase.execute({
          organizationId,
          name: body.name,
          slug: body.slug,
        })
        auditUpdate({
          request,
          entityType: 'Organization',
          entityId: organizationId,
          before,
          after: { name: body.name, slug: body.slug },
        })
        return reply.send({
          success: true,
          data: {
            id: view.id,
            name: view.name,
            slug: view.slug,
            logo: view.logo,
            createdAt: view.createdAt.toISOString(),
          },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
