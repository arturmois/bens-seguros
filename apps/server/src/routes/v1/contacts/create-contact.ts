import { container, CreateContact } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  contactDetailResponse,
  createContactBody,
  errorResponse,
} from './_schemas.js'

export function createContactRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/contacts',
    schema: {
      tags: ['Contacts'],
      summary: 'Create a new contact',
      operationId: 'createContact',
      body: createContactBody,
      response: {
        201: contactDetailResponse,
        400: errorResponse,
        422: errorResponse,
      },
    },
    preHandler: [requireAbility('create', 'Contact')],
    handler: async (request, reply) => {
      const useCase = container.resolve(CreateContact)
      try {
        const contact = await useCase.execute({
          organizationId: request.organizationId!,
          name: request.body.name,
          phone: request.body.phone,
          email: request.body.email,
          source: request.body.source,
          salespersonId: request.body.salespersonId ?? request.user!.id,
          tags: request.body.tags,
          notes: request.body.notes,
          consentLgpd: request.body.consentLgpd,
          birthDate: request.body.birthDate,
          socialMedia: request.body.socialMedia,
        })
        return reply.status(201).send({
          success: true,
          data: { ...contact, stage: 'LEAD', activePolicyCount: 0 },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
