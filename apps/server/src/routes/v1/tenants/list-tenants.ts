import { container, ListUserTenants } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { tenantListResponse } from './_schemas.js'

export function listTenantsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/tenants',
    schema: {
      operationId: 'listTenants',
      tags: ['Tenants'],
      summary: 'List tenants for authenticated user',
      response: { 200: tenantListResponse, 401: errorResponse },
    },
    handler: async (request) => {
      const useCase = container.resolve(ListUserTenants)
      const tenants = await useCase.execute(request.user!.id)
      return { success: true as const, data: tenants }
    },
  })
}
