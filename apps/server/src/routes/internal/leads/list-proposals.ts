import { createTenantClient } from '@repo/db/tenant'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../_shared/response.schema.js'
import {
  listInternalProposalsQuerySchema,
  listInternalProposalsResponse,
} from './_schemas.js'

const MAX_PROPOSALS = 10

export function listInternalProposalsRoute(app: FastifyInstance) {
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

      const tenantPrisma = createTenantClient(organizationId)

      const resolvedClientId = await resolveClientId(
        tenantPrisma,
        organizationId,
        clientId,
        phone
      )

      if (!resolvedClientId) {
        return reply.status(200).send({
          success: true,
          data: { proposals: [], total: 0 },
        })
      }

      const stageFilter = buildStageFilter(status)

      const proposals = await tenantPrisma.proposal.findMany({
        where: {
          organizationId,
          clientId: resolvedClientId,
          deletedAt: null,
          ...stageFilter,
        },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: MAX_PROPOSALS,
      })

      return reply.status(200).send({
        success: true,
        data: {
          proposals: proposals.map((p) => ({
            id: p.id,
            branch: p.branch,
            stage: p.stage,
            premiumValueInCents: p.premiumValueInCents,
            coverageStartDate: p.coverageStartDate,
            createdAt: p.createdAt,
            clientName: p.client?.name ?? '',
          })),
          total: proposals.length,
        },
      })
    },
  })
}

async function resolveClientId(
  tenantPrisma: ReturnType<typeof createTenantClient>,
  organizationId: string,
  clientId: string | undefined,
  phone: string | undefined
): Promise<string | null> {
  if (clientId) {
    return clientId
  }

  const client = await tenantPrisma.client.findFirst({
    where: { organizationId, phone, deletedAt: null },
    select: { id: true },
  })

  return client?.id ?? null
}

function buildStageFilter(status: 'ACTIVE' | 'LOST' | 'ALL') {
  if (status === 'ACTIVE') {
    return { stage: { notIn: ['LOST', 'POLICY_ISSUED'] as const } }
  }
  if (status === 'LOST') {
    return { stage: 'LOST' as const }
  }
  return {}
}
