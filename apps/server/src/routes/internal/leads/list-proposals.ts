import type { ListProposalsForClient } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../../v1/handle-domain-error.js'
import {
  listInternalProposalsQuerySchema,
  listInternalProposalsResponse,
} from './schemas/index.js'

export interface ListInternalProposalsApi {
  listProposalsFor: (
    organizationId: string
  ) => Pick<ListProposalsForClient, 'execute'>
}

export function listInternalProposalsRoute(
  app: FastifyInstance,
  api: ListInternalProposalsApi
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/internal/proposals',
    schema: {
      operationId: 'listInternalProposals',
      tags: ['Internal'],
      summary: 'List proposals for a client',
      querystring: listInternalProposalsQuerySchema,
      response: { 200: listInternalProposalsResponse, 400: errorResponse },
    },
    handler: async (request, reply) => {
      const { clientId, phone, status } = request.query
      const organizationId = request.organizationId!
      if (!clientId && !phone) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'At least one of clientId or phone is required',
          },
        })
      }
      try {
        const data = await api.listProposalsFor(organizationId).execute({
          organizationId,
          clientId,
          phone,
          status,
        })
        return reply.status(200).send({ success: true, data })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
