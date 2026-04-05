import { container, CreateProposal } from '@repo/core'
import { createTenantClient } from '@repo/db/tenant'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { createLeadBodySchema, createLeadResponse } from './_schemas.js'
import { errorResponse } from '../../_shared/response.schema.js'

const INSURANCE_TYPE_TO_BRANCH: Record<string, string> = {
  AUTO: 'AUTO',
  VIDA: 'LIFE',
  RESIDENCIAL: 'RESIDENTIAL',
  EMPRESARIAL: 'BUSINESS',
  VIAGEM: 'OTHER',
  OUTRO: 'OTHER',
}

export function createLeadRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/internal/leads',
    schema: {
      operationId: 'createLead',
      tags: ['Internal'],
      summary: 'Create a lead from chat conversation',
      body: createLeadBodySchema,
      response: { 201: createLeadResponse, 400: errorResponse },
    },
    handler: async (request, reply) => {
      const body = request.body
      const organizationId = request.organizationId!
      const tenantPrisma = createTenantClient(organizationId)

      const existing = await tenantPrisma.client.findFirst({
        where: {
          organizationId,
          phone: body.clientPhone,
          deletedAt: null,
        },
      })

      const client =
        existing ??
        (await tenantPrisma.client.create({
          data: {
            organizationId,
            name: body.clientName,
            document: '',
            type: 'LEAD',
            phone: body.clientPhone,
          },
        }))

      const member = await tenantPrisma.member.findFirst({
        where: { organizationId, active: true },
        orderBy: { createdAt: 'asc' },
      })

      if (!member) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NO_MEMBER', message: 'No active member in org' },
        })
      }

      const branch = INSURANCE_TYPE_TO_BRANCH[body.insuranceType] ?? 'OTHER'

      const useCase = container.resolve(CreateProposal)
      const proposal = await useCase.execute({
        organizationId,
        clientId: client.id,
        salespersonId: member.userId,
        branch: branch as
          | 'AUTO'
          | 'RESIDENTIAL'
          | 'CONDOMINIUM'
          | 'BUSINESS'
          | 'LIFE'
          | 'OTHER',
        boardType: 'NEW_INSURANCE',
      })

      return reply.status(201).send({
        success: true,
        data: {
          proposalId: proposal.id,
          clientId: client.id,
          message: `Lead registrado: ${body.clientName} - ${body.insuranceType}`,
        },
      })
    },
  })
}
