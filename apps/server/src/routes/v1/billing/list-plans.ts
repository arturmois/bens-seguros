import { prismaAdmin } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { listPlansResponse, type PublicPlan } from './_schemas.js'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type PlanRow = {
  id: string
  slug: string
  name: string
  description: string | null
  priceCents: number
  currency: string
  billingPeriod: 'MONTHLY' | 'YEARLY'
  sortOrder: number
  maxUsers: number | null
  maxProposalsPerMonth: number | null
  maxChannels: number | null
  maxConversationsPerOrg: number | null
  maxImportRows: number | null
  maxLogoSizeBytes: number | null
  aiEnabled: boolean
  aiMessagesIncluded: number
  aiOverageCentsPerMessage: number
  features: unknown
}

function toPayload(row: PlanRow): PublicPlan {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    currency: row.currency,
    billingPeriod: row.billingPeriod,
    sortOrder: row.sortOrder,
    maxUsers: row.maxUsers,
    maxProposalsPerMonth: row.maxProposalsPerMonth,
    maxChannels: row.maxChannels,
    maxConversationsPerOrg: row.maxConversationsPerOrg,
    maxImportRows: row.maxImportRows,
    maxLogoSizeBytes: row.maxLogoSizeBytes,
    aiEnabled: row.aiEnabled,
    aiMessagesIncluded: row.aiMessagesIncluded,
    aiOverageCentsPerMessage: row.aiOverageCentsPerMessage,
    features: isRecord(row.features) ? row.features : {},
  }
}

export function listPublicPlansRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/billing/plans',
    schema: {
      operationId: 'listBillingPlans',
      tags: ['Billing'],
      summary: 'Catálogo público de planos ativos (sem auth)',
      response: { 200: listPlansResponse },
    },
    handler: async (_request, reply) => {
      const rows = await prismaAdmin.plan.findMany({
        where: { active: true, isPublic: true },
        orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          priceCents: true,
          currency: true,
          billingPeriod: true,
          sortOrder: true,
          maxUsers: true,
          maxProposalsPerMonth: true,
          maxChannels: true,
          maxConversationsPerOrg: true,
          maxImportRows: true,
          maxLogoSizeBytes: true,
          aiEnabled: true,
          aiMessagesIncluded: true,
          aiOverageCentsPerMessage: true,
          features: true,
        },
      })
      return reply.send({
        success: true,
        data: rows.map(toPayload),
      })
    },
  })
}
