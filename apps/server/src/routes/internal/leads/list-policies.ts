import type { ListActivePoliciesForClient } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../../v1/handle-domain-error.js'
import {
  listInternalPoliciesQuerySchema,
  listInternalPoliciesResponse,
} from './schemas/index.js'

export interface ListInternalPoliciesApi {
  listPoliciesFor: (
    organizationId: string
  ) => Pick<ListActivePoliciesForClient, 'execute'>
}

export function listInternalPoliciesRoute(
  app: FastifyInstance,
  api: ListInternalPoliciesApi
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/internal/policies',
    schema: {
      operationId: 'listInternalPolicies',
      tags: ['Internal'],
      summary: 'List active policies for a client',
      querystring: listInternalPoliciesQuerySchema,
      response: { 200: listInternalPoliciesResponse, 400: errorResponse },
    },
    handler: async (request, reply) => {
      const { clientId, phone, branch } = request.query
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
        const data = await api.listPoliciesFor(organizationId).execute({
          organizationId,
          clientId,
          phone,
          branch,
        })
        return reply.status(200).send({ success: true, data })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
