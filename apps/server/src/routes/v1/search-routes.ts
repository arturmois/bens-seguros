import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma, InsuranceBranch } from '@repo/db'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { searchQuerySchema } from '../../schemas/search.schemas.js'

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function toInsuranceBranch(value: string): InsuranceBranch | null {
  const upper = value.toUpperCase()
  if (Object.values(InsuranceBranch).includes(upper as InsuranceBranch)) {
    return upper as InsuranceBranch
  }
  return null
}

export async function searchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.get(
    '/api/v1/search',
    { preHandler: [requireAbility('read', 'all')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q, limit } = searchQuerySchema.parse(request.query)
      const organizationId = request.organizationId!
      const perEntity = Math.ceil(limit / 4)
      const documentQuery = stripNonDigits(q)
      const documentPattern =
        documentQuery.length >= 2 ? `%${documentQuery}%` : null
      const numericQuery = Number.parseInt(q, 10)
      const isNumeric = !Number.isNaN(numericQuery)
      const branchMatch = toInsuranceBranch(q)

      const [clients, proposals, policies, claims] = await Promise.all([
        prisma.client.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              ...(documentPattern
                ? [
                    {
                      document: {
                        contains: documentQuery,
                        mode: 'insensitive' as const,
                      },
                    },
                  ]
                : []),
            ],
          },
          select: { id: true, name: true, document: true, type: true },
          take: perEntity,
          orderBy: { name: 'asc' },
        }),

        prisma.proposal.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              {
                client: {
                  name: { contains: q, mode: 'insensitive' },
                  deletedAt: null,
                },
              },
              ...(branchMatch ? [{ branch: { equals: branchMatch } }] : []),
            ],
          },
          select: {
            id: true,
            stage: true,
            branch: true,
            client: { select: { name: true } },
          },
          take: perEntity,
          orderBy: { createdAt: 'desc' },
        }),

        prisma.policy.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { policyNumber: { contains: q, mode: 'insensitive' } },
              {
                client: {
                  name: { contains: q, mode: 'insensitive' },
                  deletedAt: null,
                },
              },
            ],
          },
          select: {
            id: true,
            policyNumber: true,
            branch: true,
            client: { select: { name: true } },
          },
          take: perEntity,
          orderBy: { createdAt: 'desc' },
        }),

        prisma.claim.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              ...(isNumeric ? [{ claimNumber: numericQuery }] : []),
              {
                client: {
                  name: { contains: q, mode: 'insensitive' },
                  deletedAt: null,
                },
              },
              {
                policy: {
                  policyNumber: { contains: q, mode: 'insensitive' },
                  deletedAt: null,
                },
              },
            ],
          },
          select: {
            id: true,
            claimNumber: true,
            status: true,
            client: { select: { name: true } },
          },
          take: perEntity,
          orderBy: { createdAt: 'desc' },
        }),
      ])

      const data = {
        clients: clients.map((c) => ({
          id: c.id,
          name: c.name,
          document: c.document,
          type: c.type,
        })),
        proposals: proposals.map((p) => ({
          id: p.id,
          stage: p.stage,
          branch: p.branch,
          clientName: p.client.name,
        })),
        policies: policies.map((p) => ({
          id: p.id,
          policyNumber: p.policyNumber,
          branch: p.branch,
          clientName: p.client.name,
        })),
        claims: claims.map((c) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          status: c.status,
          clientName: c.client.name,
        })),
      }

      const totalResults =
        data.clients.length +
        data.proposals.length +
        data.policies.length +
        data.claims.length

      return reply.send({
        success: true,
        data,
        meta: { query: q, totalResults },
      })
    }
  )
}
