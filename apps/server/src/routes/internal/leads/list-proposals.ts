import type { Prisma } from '@repo/db'
import { createTenantClient } from '@repo/db/tenant'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../shared/response.schema.js'
import { resolveClientId } from './helpers/index.js'
import {
  listInternalProposalsQuerySchema,
  listInternalProposalsResponse,
} from './schemas/index.js'

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

      const where: Prisma.ProposalWhereInput = {
        organizationId,
        clientId: resolvedClientId,
        deletedAt: null,
      }
      if (status === 'LOST') {
        where.stage = 'LOST'
      } else if (status === 'ACTIVE') {
        where.stage = { notIn: ['LOST', 'POLICY_ISSUED'] }
      }

      const proposals = await tenantPrisma.proposal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: MAX_PROPOSALS,
      })

      // Resolve client names in a single query
      const clientIds = [...new Set(proposals.map((p) => p.clientId))]
      const clients = await tenantPrisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true },
      })
      const clientNameMap = new Map(clients.map((c) => [c.id, c.name]))

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
            clientName: clientNameMap.get(p.clientId) ?? '',
          })),
          total: proposals.length,
        },
      })
    },
  })
}
