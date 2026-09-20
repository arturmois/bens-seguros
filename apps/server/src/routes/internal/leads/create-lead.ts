import type { CaptureLead } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { handleDomainError } from '../../v1/handle-domain-error.js'
import { createLeadBodySchema, createLeadResponse } from './schemas/index.js'

export interface CreateLeadApi {
  captureLeadFor: (organizationId: string) => Pick<CaptureLead, 'execute'>
}

export function createLeadRoute(app: FastifyInstance, api: CreateLeadApi) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/internal/leads',
    schema: {
      operationId: 'createLead',
      tags: ['Internal'],
      summary: 'Create a lead (Contact + Proposal) from chat conversation',
      body: createLeadBodySchema,
      response: { 201: createLeadResponse, 400: errorResponse },
    },
    handler: async (request, reply) => {
      const body = request.body
      const organizationId = request.organizationId!
      try {
        const data = await api.captureLeadFor(organizationId).execute({
          organizationId,
          clientName: body.clientName,
          clientPhone: body.clientPhone,
          insuranceType: body.insuranceType,
          notes: body.notes,
          source: body.source,
        })
        return reply.status(201).send({
          success: true,
          data,
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
