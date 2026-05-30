import type { Entitlements } from '@repo/auth/entitlements'
import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'

export interface PlanShape {
  readonly maxUsers: number | null
  readonly maxProposalsPerMonth: number | null
  readonly maxChannels: number | null
  readonly maxConversationsPerOrg: number | null
  readonly maxImportRows: number | null
  readonly maxLogoSizeBytes: number | null
  readonly aiEnabled: boolean
  readonly aiMessagesIncluded: number
  readonly aiOverageCentsPerMessage: number
  readonly features: Readonly<Record<string, unknown>>
}

export interface SubscriptionShape {
  readonly status: SubscriptionStatusInput
  readonly trialEndsAt: Date | null
  readonly billingManagedExternally: boolean
  readonly customQuotas: Readonly<Record<string, unknown>> | null
}

type SubscriptionStatusInput =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'BILLED_EXTERNALLY'

const ACTIVE_STATUSES: ReadonlySet<SubscriptionStatusInput> =
  new Set<SubscriptionStatusInput>(['ACTIVE', 'TRIALING', 'BILLED_EXTERNALLY'])

type QuotaOverrideKey =
  | 'maxUsers'
  | 'maxProposalsPerMonth'
  | 'maxChannels'
  | 'maxConversationsPerOrg'
  | 'maxImportRows'
  | 'maxLogoSizeBytes'
  | 'aiMessagesIncluded'
  | 'aiOverageCentsPerMessage'

type FeatureOverrideKey =
  | 'aiEnabled'
  | 'customBranding'
  | 'apiAccess'
  | 'advancedReports'
  | 'prioritySupport'

function pickQuotaOverride(
  customQuotas: Readonly<Record<string, unknown>> | null,
  key: QuotaOverrideKey
): number | null | undefined {
  if (!customQuotas) return undefined
  const value = customQuotas[key]
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pickFeatureOverride(
  customQuotas: Readonly<Record<string, unknown>> | null,
  key: FeatureOverrideKey
): boolean | undefined {
  if (!customQuotas) return undefined
  const overrides = customQuotas['features']
  if (!isRecord(overrides)) return undefined
  const value = overrides[key]
  return typeof value === 'boolean' ? value : undefined
}

function readPlanFeature(plan: PlanShape, key: FeatureOverrideKey): boolean {
  const value = plan.features[key]
  return typeof value === 'boolean' ? value : false
}

export function buildEntitlements(
  subscription: SubscriptionShape | null,
  plan: PlanShape | null
): Entitlements {
  if (!subscription || !plan) {
    return DEFAULT_PERMISSIVE_ENTITLEMENTS
  }

  const overrides = subscription.customQuotas
  const pickQuota = (
    key: QuotaOverrideKey,
    planValue: number | null
  ): number | null => {
    const override = pickQuotaOverride(overrides, key)
    if (override !== undefined) return override
    return planValue
  }

  const pickQuotaNumber = (
    key: QuotaOverrideKey,
    planValue: number
  ): number => {
    const override = pickQuotaOverride(overrides, key)
    if (typeof override === 'number') return override
    return planValue
  }

  const pickFeature = (
    key: FeatureOverrideKey,
    planValue: boolean
  ): boolean => {
    const override = pickFeatureOverride(overrides, key)
    return override ?? planValue
  }

  const isActive = ACTIVE_STATUSES.has(subscription.status)

  return {
    maxUsers: pickQuota('maxUsers', plan.maxUsers),
    maxProposalsPerMonth: pickQuota(
      'maxProposalsPerMonth',
      plan.maxProposalsPerMonth
    ),
    maxChannels: pickQuota('maxChannels', plan.maxChannels),
    maxConversationsPerOrg: pickQuota(
      'maxConversationsPerOrg',
      plan.maxConversationsPerOrg
    ),
    maxImportRows: pickQuota('maxImportRows', plan.maxImportRows),
    maxLogoSizeBytes: pickQuota('maxLogoSizeBytes', plan.maxLogoSizeBytes),

    aiEnabled: pickFeature('aiEnabled', plan.aiEnabled),
    aiMessagesIncluded: pickQuotaNumber(
      'aiMessagesIncluded',
      plan.aiMessagesIncluded
    ),
    aiOverageCentsPerMessage: pickQuotaNumber(
      'aiOverageCentsPerMessage',
      plan.aiOverageCentsPerMessage
    ),

    customBranding: pickFeature(
      'customBranding',
      readPlanFeature(plan, 'customBranding')
    ),
    apiAccess: pickFeature('apiAccess', readPlanFeature(plan, 'apiAccess')),
    advancedReports: pickFeature(
      'advancedReports',
      readPlanFeature(plan, 'advancedReports')
    ),
    prioritySupport: pickFeature(
      'prioritySupport',
      readPlanFeature(plan, 'prioritySupport')
    ),

    isActive,
    isTrialing: subscription.status === 'TRIALING',
    trialEndsAt: subscription.trialEndsAt,
    billingManagedExternally: subscription.billingManagedExternally,
  }
}
