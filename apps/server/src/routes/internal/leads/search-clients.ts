import { createTenantClient } from '@repo/db/tenant'
import { hashDocument, stripNonDigits } from '@repo/shared'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../shared/response.schema.js'
import {
  searchClientsQuerySchema,
  searchClientsResponse,
} from './schemas/index.js'

interface ResolvedClient {
  id: string
  legalName: string
  email: string | null
  phone: string | null
}

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
      const resolved = await resolveClient(
        tenantPrisma,
        organizationId,
        phone,
        document
      )
      if (!resolved) {
        return reply.status(200).send({
          success: true,
          data: { found: false, client: null },
        })
      }
      const [activePoliciesCount, openProposalsCount] = await Promise.all([
        tenantPrisma.policy.count({
          where: {
            organizationId,
            clientId: resolved.id,
            status: 'ACTIVE',
            deletedAt: null,
          },
        }),
        tenantPrisma.proposal.count({
          where: {
            organizationId,
            contact: { clientId: resolved.id },
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
            id: resolved.id,
            name: resolved.legalName,
            type:
              activePoliciesCount > 0 ? ('CLIENT' as const) : ('LEAD' as const),
            email: resolved.email,
            phone: resolved.phone,
            hasActivePolicy: activePoliciesCount > 0,
            activePoliciesCount,
            openProposalsCount,
          },
        },
      })
    },
  })
}
async function resolveClient(
  tenantPrisma: ReturnType<typeof createTenantClient>,
  organizationId: string,
  phone: string | undefined,
  document: string | undefined
): Promise<ResolvedClient | null> {
  if (document) {
    const digits = stripNonDigits(document)
    const client = await tenantPrisma.client.findFirst({
      where: {
        organizationId,
        documentHash: hashDocument(digits),
        deletedAt: null,
      },
    })
    if (!client) return null
    const contact = await tenantPrisma.contact.findFirst({
      where: { organizationId, clientId: client.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { email: true, phone: true },
    })
    return {
      id: client.id,
      legalName: client.legalName,
      email: contact?.email ?? null,
      phone: contact?.phone ?? null,
    }
  }
  if (phone) {
    const contact = await tenantPrisma.contact.findFirst({
      where: { organizationId, phone, deletedAt: null },
      include: { client: true },
    })
    if (!contact?.client) return null
    return {
      id: contact.client.id,
      legalName: contact.client.legalName,
      email: contact.email,
      phone: contact.phone,
    }
  }
  return null
}
