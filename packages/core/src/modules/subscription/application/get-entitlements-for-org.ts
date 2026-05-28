import type { Entitlements } from '@repo/auth/entitlements'
import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'

import { buildEntitlements } from './build-entitlements.js'

export interface SubscriptionLookupClient {
  subscription: {
    findUnique(args: {
      where: { organizationId: string }
      include: { plan: true }
    }): Promise<SubscriptionWithPlanRow | null>
  }
}

interface SubscriptionWithPlanRow {
  readonly status:
    | 'TRIALING'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'CANCELED'
    | 'EXPIRED'
    | 'BILLED_EXTERNALLY'
  readonly trialEndsAt: Date | null
  readonly billingManagedExternally: boolean
  readonly customQuotas: unknown
  readonly plan: {
    readonly maxUsers: number | null
    readonly maxProposalsPerMonth: number | null
    readonly maxChannels: number | null
    readonly maxConversationsPerOrg: number | null
    readonly maxImportRows: number | null
    readonly maxLogoSizeBytes: number | null
    readonly aiEnabled: boolean
    readonly aiMessagesIncluded: number
    readonly aiOverageCentsPerMessage: number
    readonly features: unknown
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function getEntitlementsForOrg(
  prisma: SubscriptionLookupClient,
  organizationId: string
): Promise<Entitlements> {
  const row = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  })

  if (!row) return DEFAULT_PERMISSIVE_ENTITLEMENTS

  return buildEntitlements(
    {
      status: row.status,
      trialEndsAt: row.trialEndsAt,
      billingManagedExternally: row.billingManagedExternally,
      customQuotas: isRecord(row.customQuotas) ? row.customQuotas : null,
    },
    {
      maxUsers: row.plan.maxUsers,
      maxProposalsPerMonth: row.plan.maxProposalsPerMonth,
      maxChannels: row.plan.maxChannels,
      maxConversationsPerOrg: row.plan.maxConversationsPerOrg,
      maxImportRows: row.plan.maxImportRows,
      maxLogoSizeBytes: row.plan.maxLogoSizeBytes,
      aiEnabled: row.plan.aiEnabled,
      aiMessagesIncluded: row.plan.aiMessagesIncluded,
      aiOverageCentsPerMessage: row.plan.aiOverageCentsPerMessage,
      features: isRecord(row.plan.features) ? row.plan.features : {},
    }
  )
}
