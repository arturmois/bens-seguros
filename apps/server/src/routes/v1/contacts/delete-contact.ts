import { container, SoftDeleteContact } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { contactParams } from './_schemas.js'

export function deleteContactRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'DELETE',
    url: '/api/v1/contacts/:id',
    schema: {
      tags: ['Contacts'],
      summary: 'Soft delete contact',
      operationId: 'deleteContact',
      params: contactParams,
    },
    preHandler: [requireAbility('delete', 'Contact')],
    handler: async (request, reply) => {
      try {
        const useCase = container.resolve(SoftDeleteContact)
        await useCase.execute({
          id: request.params.id,
          organizationId: request.organizationId!,
        })
        return reply.status(204).send()
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
