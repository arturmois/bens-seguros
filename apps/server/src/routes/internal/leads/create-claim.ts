import { container, CreateClaim } from '@repo/core'
import type { Prisma } from '@repo/db'
import { createTenantClient } from '@repo/db/tenant'
import { hashDocument, stripNonDigits } from '@repo/shared'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../_shared/response.schema.js'
import {
  createInternalClaimBodySchema,
  createInternalClaimResponse,
} from './_schemas.js'

const DOCUMENT_CPF_LENGTH = 11
const DOCUMENT_CNPJ_LENGTH = 14

function isDocument(value: string): boolean {
  const digits = stripNonDigits(value)
  return (
    digits.length === DOCUMENT_CPF_LENGTH ||
    digits.length === DOCUMENT_CNPJ_LENGTH
  )
}

export function createInternalClaimRoute(app: FastifyInstance) {
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
      const {
        phoneOrDocument,
        description,
        incidentDate,
        incidentLocation,
        insuranceType,
      } = request.body
      const organizationId = request.organizationId!
      const tenantPrisma = createTenantClient(organizationId)

      const client = await findClient(
        tenantPrisma,
        organizationId,
        phoneOrDocument
      )

      if (!client) {
        return reply.status(201).send({
          success: true,
          data: {
            claimCreated: false,
            claimNumber: null,
            dataSaved: true,
            claimData: {
              phoneOrDocument,
              description,
              incidentDate: incidentDate ?? null,
              incidentLocation: incidentLocation ?? null,
              insuranceType: insuranceType ?? null,
            },
            message:
              'Cliente não encontrado. Dados registrados para o corretor.',
          },
        })
      }

      const policyWhere: Prisma.PolicyWhereInput = {
        organizationId,
        clientId: client.id,
        status: 'ACTIVE',
      }
      if (insuranceType) {
        policyWhere.branch = insuranceType as Prisma.PolicyWhereInput['branch']
      }

      const policy = await tenantPrisma.policy.findFirst({
        where: policyWhere,
        orderBy: { endDate: 'desc' },
      })

      if (!policy) {
        return reply.status(201).send({
          success: true,
          data: {
            claimCreated: false,
            claimNumber: null,
            dataSaved: true,
            claimData: {
              clientId: client.id,
              clientName: client.name,
              phoneOrDocument,
              description,
              incidentDate: incidentDate ?? null,
              incidentLocation: incidentLocation ?? null,
              insuranceType: insuranceType ?? null,
            },
            message:
              'Nenhuma apólice ativa encontrada. Dados registrados para o corretor.',
          },
        })
      }

      const claim = await container.resolve(CreateClaim).execute({
        organizationId,
        policyId: policy.id,
        clientId: client.id,
        insurerId: policy.insurerId ?? undefined,
        priority: 'URGENT',
        description,
        incidentDate: incidentDate ? new Date(incidentDate) : undefined,
        incidentLocation,
      })

      return reply.status(201).send({
        success: true,
        data: {
          claimCreated: true,
          claimNumber: `SIN-${String(claim.claimNumber)}`,
          dataSaved: false,
          claimData: null,
          message: `Sinistro ${String(claim.claimNumber)} registrado com prioridade urgente.`,
        },
      })
    },
  })
}

async function findClient(
  tenantPrisma: ReturnType<typeof createTenantClient>,
  organizationId: string,
  phoneOrDocument: string
) {
  const base = { organizationId, deletedAt: null }

  if (isDocument(phoneOrDocument)) {
    const digits = stripNonDigits(phoneOrDocument)
    return tenantPrisma.client.findFirst({
      where: { ...base, documentHash: hashDocument(digits) },
    })
  }

  return tenantPrisma.client.findFirst({
    where: { ...base, phone: phoneOrDocument },
  })
}
