import { container, CreateContact, CreateProposal } from '@repo/core'
import { createTenantClient } from '@repo/db/tenant'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { handleDomainError } from '../../v1/handle-domain-error.js'
import { errorResponse } from '../../shared/response.schema.js'
import { createLeadBodySchema, createLeadResponse } from './schemas/index.js'

type Branch =
  | 'AUTO'
  | 'RESIDENTIAL'
  | 'CONDOMINIUM'
  | 'BUSINESS'
  | 'LIFE'
  | 'OTHER'

const INSURANCE_TYPE_TO_BRANCH: Record<string, Branch> = {
  AUTO: 'AUTO',
  VIDA: 'LIFE',
  RESIDENCIAL: 'RESIDENTIAL',
  EMPRESARIAL: 'BUSINESS',
  CONDOMINIO: 'CONDOMINIUM',
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
      summary: 'Create a lead (Contact + Proposal) from chat conversation',
      body: createLeadBodySchema,
      response: { 201: createLeadResponse, 400: errorResponse },
    },
    handler: async (request, reply) => {
      const body = request.body
      const organizationId = request.organizationId!
      const tenantPrisma = createTenantClient(organizationId)

      try {
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

        // Look up Contact by phone (no Client creation — clients are only created
        // on promotion via /api/internal/contacts/:id/promote with a real document).
        const existingContact = await tenantPrisma.contact.findFirst({
          where: {
            organizationId,
            phone: body.clientPhone,
            deletedAt: null,
          },
        })

        let contactId: string
        if (existingContact) {
          contactId = existingContact.id
        } else {
          const createContactUC = container.resolve(CreateContact)
          const contact = await createContactUC.execute({
            organizationId,
            name: body.clientName,
            phone: body.clientPhone,
            source: body.source ?? 'MANUAL',
            salespersonId: member.userId,
            consentLgpd: true,
          })
          contactId = contact.id
        }

        const branch = INSURANCE_TYPE_TO_BRANCH[body.insuranceType] ?? 'OTHER'

        const useCase = container.resolve(CreateProposal)
        const proposal = await useCase.execute({
          organizationId,
          contactId,
          salespersonId: member.userId,
          branch,
          boardType: 'NEW_INSURANCE',
        })

        return reply.status(201).send({
          success: true,
          data: {
            proposalId: proposal.id,
            contactId,
            message: `Lead registrado: ${body.clientName} - ${body.insuranceType}`,
          },
        })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
