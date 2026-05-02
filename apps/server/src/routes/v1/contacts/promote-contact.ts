import { container, PromoteContact } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  contactParams,
  errorResponse,
  promoteContactBody,
  promoteContactResponse,
} from './_schemas.js'

export function promoteContactRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/contacts/:id/promote',
    schema: {
      tags: ['Contacts'],
      summary: 'Promote contact to client (provide document)',
      operationId: 'promoteContact',
      params: contactParams,
      body: promoteContactBody,
      response: {
        200: promoteContactResponse,
        404: errorResponse,
        409: errorResponse,
      },
    },
    preHandler: [requireAbility('update', 'Contact')],
    handler: async (request, reply) => {
      try {
        const useCase = container.resolve(PromoteContact)
        const client = await useCase.execute({
          contactId: request.params.id,
          organizationId: request.organizationId!,
          document: request.body.document,
          legalName: request.body.legalName,
          personType: request.body.personType,
          profession: request.body.profession,
          maritalStatus: request.body.maritalStatus,
          address: request.body.address,
          fiscalBirthDate: request.body.fiscalBirthDate,
        })
        return reply.send({
          success: true,
          data: {
            clientId: client.id,
            legalName: client.legalName,
            document: client.document,
          },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
