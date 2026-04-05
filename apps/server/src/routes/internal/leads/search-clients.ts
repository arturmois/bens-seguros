import { createTenantClient } from '@repo/db/tenant'
import { hashDocument, stripNonDigits } from '@repo/shared'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../_shared/response.schema.js'
import { searchClientsQuerySchema, searchClientsResponse } from './_schemas.js'

export function searchClientsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/internal/clients/search',
    schema: {
      operationId: 'searchClients',
      tags: ['Internal'],
      summary: 'Search client by phone or document',
      querystring: searchClientsQuerySchema,
      response: { 200: searchClientsResponse, 400: errorResponse },
    },
    handler: async (request, reply) => {
      const { phone, document } = request.query
      const organizationId = request.organizationId!

      if (!phone && !document) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'At least one of phone or document is required',
          },
        })
      }

      const tenantPrisma = createTenantClient(organizationId)

      const where = buildWhereClause(organizationId, phone, document)

      const client = await tenantPrisma.client.findFirst({ where })

      if (!client) {
        return reply.status(200).send({
          success: true,
          data: { found: false, client: null },
        })
      }

      const [activePoliciesCount, openProposalsCount] = await Promise.all([
        tenantPrisma.policy.count({
          where: {
            organizationId,
            clientId: client.id,
            status: 'ACTIVE',
            deletedAt: null,
          },
        }),
        tenantPrisma.proposal.count({
          where: {
            organizationId,
            clientId: client.id,
            stage: { notIn: ['POLICY_ISSUED', 'LOST'] },
            deletedAt: null,
          },
        }),
      ])

      return reply.status(200).send({
        success: true,
        data: {
          found: true,
          client: {
            id: client.id,
            name: client.name,
            type: client.type,
            email: client.email ?? null,
            phone: client.phone ?? null,
            hasActivePolicy: activePoliciesCount > 0,
            activePoliciesCount,
            openProposalsCount,
          },
        },
      })
    },
  })
}

function buildWhereClause(
  organizationId: string,
  phone: string | undefined,
  document: string | undefined
) {
  const base = { organizationId, deletedAt: null }

  if (document) {
    const digits = stripNonDigits(document)
    return { ...base, documentHash: hashDocument(digits) }
  }

  return { ...base, phone }
}
