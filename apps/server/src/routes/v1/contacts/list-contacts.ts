import { container, ListContacts } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  contactListResponse,
  errorResponse,
  listContactsQuery,
} from './_schemas.js'

export function listContactsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/contacts',
    schema: {
      tags: ['Contacts'],
      summary: 'List contacts (paginated)',
      operationId: 'listContacts',
      querystring: listContactsQuery,
      response: { 200: contactListResponse, 400: errorResponse },
    },
    preHandler: [requireAbility('read', 'Contact')],
    handler: async (request, reply) => {
      const useCase = container.resolve(ListContacts)
      try {
        const page = await useCase.execute({
          organizationId: request.organizationId!,
          stage: request.query.stage,
          source: request.query.source,
          salespersonId: request.query.salespersonId,
          stageIn: request.query.stageIn,
          sourceIn: request.query.sourceIn,
          salespersonIdIn: request.query.salespersonIdIn,
          consentLgpd: request.query.consentLgpd,
          createdFrom: request.query.createdFrom,
          createdTo: request.query.createdTo,
          search: request.query.search,
          cursor: request.query.cursor,
          limit: request.query.limit,
          sortBy: request.query.sortBy,
          sortOrder: request.query.sortOrder,
        })
        return reply.send({
          success: true,
          data: page.items,
          meta: { nextCursor: page.nextCursor },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
