import { z } from 'zod'

import { successResponse } from '../../shared/response.schema.js'

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
