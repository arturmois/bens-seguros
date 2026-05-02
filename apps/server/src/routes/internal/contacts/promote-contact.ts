import { container, PromoteContact } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { handleDomainError } from '../../v1/handle-domain-error.js'
import { errorResponse } from '../../shared/response.schema.js'

const paramsSchema = z.object({ id: z.string().min(1) })

const bodySchema = z.object({
  document: z.string().trim().min(11),
  legalName: z.string().optional(),
  personType: z.enum(['INDIVIDUAL', 'COMPANY']).optional(),
})

const promoteResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ clientId: z.string() }),
})

export function internalPromoteContactRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/internal/contacts/:id/promote',
    schema: {
      operationId: 'internalPromoteContact',
      tags: ['Internal'],
      summary: 'Promote contact to client (chat-worker entrypoint)',
      params: paramsSchema,
      body: bodySchema,
      response: {
        200: promoteResponseSchema,
        400: errorResponse,
        404: errorResponse,
        409: errorResponse,
      },
    },
    handler: async (request, reply) => {
      try {
        const useCase = container.resolve(PromoteContact)
        const client = await useCase.execute({
          contactId: request.params.id,
          organizationId: request.organizationId!,
          document: request.body.document,
          legalName: request.body.legalName,
          personType: request.body.personType,
        })
        return reply.send({ success: true, data: { clientId: client.id } })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
