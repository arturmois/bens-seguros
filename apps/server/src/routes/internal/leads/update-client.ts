import type { UpdateClientFiscal } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../../v1/handle-domain-error.js'
import {
  updateClientBodySchema,
  updateClientParamsSchema,
  updateClientResponse,
} from './schemas/index.js'

export interface UpdateInternalClientApi {
  updateClientFiscalFor: (
    organizationId: string
  ) => Pick<UpdateClientFiscal, 'execute'>
}

export function updateClientRoute(
  app: FastifyInstance,
  api: UpdateInternalClientApi
) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/internal/clients/:id',
    schema: {
      operationId: 'updateClientInternal',
      tags: ['Internal'],
      summary: 'Update client fiscal data from chat conversation',
      params: updateClientParamsSchema,
      body: updateClientBodySchema,
      response: {
        200: updateClientResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params
      const body = request.body
      const organizationId = request.organizationId!
      try {
        await api.updateClientFiscalFor(organizationId).execute({
          id,
          organizationId,
          document: body.document,
          email: body.email,
          address: body.address,
          birthDate: body.birthDate,
          profession: body.profession,
          maritalStatus: body.maritalStatus,
        })
        return reply.status(200).send({
          success: true,
          data: { success: true, message: 'Dados do cliente atualizados' },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
