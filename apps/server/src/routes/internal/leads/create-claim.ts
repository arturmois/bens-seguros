import type { RegisterClaimFromChat } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../../v1/handle-domain-error.js'
import {
  createInternalClaimBodySchema,
  createInternalClaimResponse,
} from './schemas/index.js'

export interface CreateInternalClaimApi {
  registerClaimFromChatFor: (
    organizationId: string
  ) => Pick<RegisterClaimFromChat, 'execute'>
}

export function createInternalClaimRoute(
  app: FastifyInstance,
  api: CreateInternalClaimApi
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/internal/claims',
    schema: {
      operationId: 'createInternalClaim',
      tags: ['Internal'],
      summary: 'Register a claim from chat conversation',
      body: createInternalClaimBodySchema,
      response: { 201: createInternalClaimResponse, 400: errorResponse },
    },
    handler: async (request, reply) => {
      const organizationId = request.organizationId!
      try {
        const data = await api
          .registerClaimFromChatFor(organizationId)
          .execute({
            organizationId,
            phoneOrDocument: request.body.phoneOrDocument,
            description: request.body.description,
            incidentDate: request.body.incidentDate,
            incidentLocation: request.body.incidentLocation,
            insuranceType: request.body.insuranceType,
          })
        return reply.status(201).send({ success: true, data })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
