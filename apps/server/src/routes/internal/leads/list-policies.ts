import type { Prisma } from '@repo/db'
import { createTenantClient } from '@repo/db/tenant'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../_shared/response.schema.js'
import { resolveClientId } from './_helpers.js'
import {
  listInternalPoliciesQuerySchema,
  listInternalPoliciesResponse,
} from './_schemas.js'

const MAX_POLICIES = 10

export function listInternalPoliciesRoute(app: FastifyInstance) {
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
          data: { policies: [], total: 0 },
        })
      }

      const where: Prisma.PolicyWhereInput = {
        organizationId,
        clientId: resolvedClientId,
        status: 'ACTIVE',
        deletedAt: null,
      }
      if (branch) {
        where.branch = branch as Prisma.PolicyWhereInput['branch']
      }

      const policies = await tenantPrisma.policy.findMany({
        where,
        include: { insurer: { select: { name: true } } },
        orderBy: { endDate: 'desc' },
        take: MAX_POLICIES,
      })

      return reply.status(200).send({
        success: true,
        data: {
          policies: policies.map((p) => ({
            id: p.id,
            policyNumber: String(p.policyNumber),
            branch: p.branch,
            status: p.status,
            startDate: p.startDate,
            endDate: p.endDate,
            premiumValueInCents: p.premiumValueInCents,
            insurerName: p.insurer?.name ?? null,
          })),
          total: policies.length,
        },
      })
    },
  })
}
