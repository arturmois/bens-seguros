import { z } from 'zod'

import { paginationQuery } from '../../shared/pagination.schema.js'
import {
  paginatedResponse,
  successResponse,
} from '../../shared/response.schema.js'

const subscriptionStatusEnum = z.enum([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'EXPIRED',
  'BILLED_EXTERNALLY',
])

const planSchema = z.object({
  slug: z.string(),
  maxUsers: z.number().int().nullable(),
  maxProposalsPerMonth: z.number().int().nullable(),
  maxChannels: z.number().int().nullable(),
  maxConversationsPerOrg: z.number().int().nullable(),
  maxImportRows: z.number().int().nullable(),
  maxLogoSizeBytes: z.number().int().nullable(),
  aiEnabled: z.boolean(),
  aiMessagesIncluded: z.number().int(),
  aiOverageCentsPerMessage: z.number().int(),
})

const subscriptionPayloadSchema = z.object({
  id: z.string(),
  status: subscriptionStatusEnum,
  billingManagedExternally: z.boolean(),
  trialEndsAt: z.string().datetime().nullable(),
  currentPeriodEnd: z.string().datetime().nullable(),
  plan: planSchema,
})

const entitlementsPayloadSchema = z.object({
  maxUsers: z.number().int().nullable(),
  maxProposalsPerMonth: z.number().int().nullable(),
  maxChannels: z.number().int().nullable(),
  maxConversationsPerOrg: z.number().int().nullable(),
  maxImportRows: z.number().int().nullable(),
  maxLogoSizeBytes: z.number().int().nullable(),
  aiEnabled: z.boolean(),
  aiMessagesIncluded: z.number().int(),
  aiOverageCentsPerMessage: z.number().int(),
  customBranding: z.boolean(),
  apiAccess: z.boolean(),
  advancedReports: z.boolean(),
  prioritySupport: z.boolean(),
  isActive: z.boolean(),
  isTrialing: z.boolean(),
  trialEndsAt: z.string().datetime().nullable(),
  billingManagedExternally: z.boolean(),
})

export const billingCurrentResponse = successResponse(
  z.object({
    subscription: subscriptionPayloadSchema.nullable(),
    entitlements: entitlementsPayloadSchema,
  })
)

const invoiceStatusEnum = z.enum([
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELED',
  'REFUNDED',
])

const paymentMethodEnum = z.enum(['CREDIT_CARD', 'BOLETO', 'PIX'])

const invoiceItemSchema = z.object({
  id: z.string(),
  status: invoiceStatusEnum,
  amountCents: z.number().int(),
  baseAmountCents: z.number().int(),
  overageAmountCents: z.number().int(),
  dueDate: z.string().datetime(),
  paidAt: z.string().datetime().nullable(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  paymentMethod: paymentMethodEnum.nullable(),
  invoiceUrl: z.string().nullable(),
  receiptUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
})

export const listInvoicesQuery = paginationQuery(20, 100)
export const invoiceListResponse = paginatedResponse(invoiceItemSchema)

export const aiUsageQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})

const aiUsageSeriesItemSchema = z.object({
  date: z.string(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  totalCostMicrocents: z.number().int(),
  messageCount: z.number().int(),
})

const aiUsageTotalsSchema = z.object({
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  totalCostMicrocents: z.number().int(),
  messageCount: z.number().int(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
})

export const aiUsageResponse = successResponse(
  z.object({
    series: z.array(aiUsageSeriesItemSchema),
    totals: aiUsageTotalsSchema,
  })
)

export const cancelSubscriptionResponse = successResponse(
  z.object({
    canceledAt: z.string().datetime(),
    currentPeriodEnd: z.string().datetime(),
  })
)

const billingPeriodEnum = z.enum(['MONTHLY', 'YEARLY'])

const publicPlanSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priceCents: z.number().int(),
  currency: z.string(),
  billingPeriod: billingPeriodEnum,
  sortOrder: z.number().int(),
  maxUsers: z.number().int().nullable(),
  maxProposalsPerMonth: z.number().int().nullable(),
  maxChannels: z.number().int().nullable(),
  maxConversationsPerOrg: z.number().int().nullable(),
  maxImportRows: z.number().int().nullable(),
  maxLogoSizeBytes: z.number().int().nullable(),
  aiEnabled: z.boolean(),
  aiMessagesIncluded: z.number().int(),
  aiOverageCentsPerMessage: z.number().int(),
  features: z.record(z.string(), z.unknown()),
})

export type PublicPlan = z.infer<typeof publicPlanSchema>

export const listPlansResponse = successResponse(z.array(publicPlanSchema))
