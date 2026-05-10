import { container, GetOrganization } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../handle-domain-error.js'
import { organizationDetailResponse } from './_schemas.js'

export function getOrganizationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/organization',
    schema: {
      operationId: 'getOrganization',
      tags: ['Organization'],
      summary: 'Get current organization details',
      response: { 200: organizationDetailResponse, 404: errorResponse },
    },
    handler: async (request, reply) => {
      const useCase = container.resolve(GetOrganization)
      try {
        const view = await useCase.execute(request.organizationId!)
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
