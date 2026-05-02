import { container, GetContact, UpdateContact } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  contactDetailResponse,
  contactParams,
  errorResponse,
  updateContactBody,
} from './_schemas.js'

export function updateContactRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PATCH',
    url: '/api/v1/contacts/:id',
    schema: {
      tags: ['Contacts'],
      summary: 'Update contact (non-fiscal fields)',
      operationId: 'updateContact',
      params: contactParams,
      body: updateContactBody,
      response: {
        200: contactDetailResponse,
        404: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Contact')],
    handler: async (request, reply) => {
      try {
        const useCase = container.resolve(UpdateContact)
        const updated = await useCase.execute({
          id: request.params.id,
          organizationId: request.organizationId!,
          name: request.body.name,
          phone: request.body.phone,
          email: request.body.email,
          tags: request.body.tags,
          notes: request.body.notes,
          birthDate: request.body.birthDate,
          socialMedia: request.body.socialMedia,
          salespersonId: request.body.salespersonId,
        })
        const getUseCase = container.resolve(GetContact)
        const withStage = await getUseCase.execute({
          id: updated.id,
          organizationId: updated.organizationId,
        })
        return reply.send({ success: true, data: withStage })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
