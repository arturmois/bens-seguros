import { container, LookupCep } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { handleDomainError } from '../handle-domain-error.js'
import { cepLookupResponse, cepParamSchema, errorResponse } from './_schemas.js'

export function getCepRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/cep/:cep',
    schema: {
      tags: ['CEP'],
      summary: 'Lookup Brazilian address by postal code (CEP)',
      operationId: 'getCep',
      params: cepParamSchema,
      response: {
        200: cepLookupResponse,
        400: errorResponse,
        404: errorResponse,
        502: errorResponse,
      },
    },
    handler: async (request, reply) => {
      const useCase = container.resolve(LookupCep)
      try {
        const data = await useCase.execute({ cep: request.params.cep })
        return reply.send({ success: true, data })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
