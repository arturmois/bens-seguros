import { z } from 'zod'

import { successResponse } from '../../shared/response.schema.js'

const VALID_PRESETS = ['7d', '30d', '90d', '6m'] as const

export const dashboardStatsQuerySchema = z.object({
  preset: z.enum(VALID_PRESETS).default('30d'),
})

export type DashboardPreset = (typeof VALID_PRESETS)[number]

export function presetToDays(preset: DashboardPreset): number {
  const map: Record<DashboardPreset, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '6m': 180,
  }
  return map[preset]
}

// --- Response schemas ---

const metricComparisonSchema = z.object({
  current: z.number(),
  previous: z.number(),
  changePercent: z.number(),
})

const conversionRateSchema = z.object({
  total: z.number(),
  issued: z.number(),
  rate: z.number(),
})

const monthlyTrendSchema = z.object({
  month: z.string(),
  proposals: z.number(),
  issued: z.number(),
})

const proposalByStageSchema = z.object({
  stage: z.string(),
  _count: z.number(),
})

const claimByPrioritySchema = z.object({
  priority: z.string(),
  _count: z.number(),
})

const commissionByStatusSchema = z.object({
  status: z.string(),
  _count: z.number(),
  _sum: z.object({
    commissionValueInCents: z.number().nullable(),
  }),
})

const rankingEntrySchema = z.object({
  salespersonId: z.string(),
  salespersonName: z.string(),
  policiesIssued: z.number(),
  totalPremiumCents: z.number(),
  averageTicketCents: z.number(),
})

const warningsSchema = z.object({
  total: z.number(),
  claimsOpen: z.number(),
  assistancesOpen: z.number(),
})

const proposalsPendingBucketsSchema = z.object({
  total: z.number(),
  inDay: z.number(),
  warning: z.number(),
  critical: z.number(),
})

const dashboardDataSchema = z.object({
  proposalsByStage: z.array(proposalByStageSchema).readonly(),
  activePolicies: z.number(),
  expiringPolicies: z.number(),
  renewalsNext7Days: z.number(),
  claimsByPriority: z.array(claimByPrioritySchema).readonly(),
  commissionsThisMonth: z.array(commissionByStatusSchema).readonly(),
  conversionRate: conversionRateSchema,
  monthlyTrends: z.array(monthlyTrendSchema).readonly(),
  comparison: z.object({
    proposals: metricComparisonSchema,
    policies: metricComparisonSchema,
    claims: metricComparisonSchema,
    commissionsPending: metricComparisonSchema,
  }),
  totalPremium: metricComparisonSchema,
  averageTicket: metricComparisonSchema,
  commissionsReceivable: z.number(),
  ranking: z.array(rankingEntrySchema).readonly(),
  // --- SCRUM-25 additions ---
  newInsurance: metricComparisonSchema,
  renewal7dPremiumCents: z.number(),
  warnings: warningsSchema,
  proposalsPending: proposalsPendingBucketsSchema,
})

export const dashboardStatsResponse = successResponse(dashboardDataSchema)

export const dashboardPdfResponse = successResponse(
  z.object({ url: z.string() })
)
