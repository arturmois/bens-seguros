import { container, GetContact } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  contactDetailResponse,
  contactParams,
  errorResponse,
} from './_schemas.js'

export function getContactRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/contacts/:id',
    schema: {
      tags: ['Contacts'],
      summary: 'Get contact by id',
      operationId: 'getContact',
      params: contactParams,
      response: { 200: contactDetailResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('read', 'Contact')],
    handler: async (request, reply) => {
      const useCase = container.resolve(GetContact)
      try {
        const contact = await useCase.execute({
          id: request.params.id,
          organizationId: request.organizationId!,
        })
        return reply.send({ success: true, data: contact })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
