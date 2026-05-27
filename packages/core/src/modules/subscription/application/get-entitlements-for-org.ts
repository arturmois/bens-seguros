import type { Entitlements } from '@repo/auth/entitlements'
import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'

import { buildEntitlements } from './build-entitlements.js'

// Minimal Prisma-shaped client interface so consumers (workers) can pass any
// PrismaClient without dragging the full @repo/db type surface here. The
// function is intentionally untyped against the generated PrismaClient to keep
// @repo/core decoupled from the DB layer.
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

// Fetches subscription + plan for an org and projects to Entitlements.
// Returns DEFAULT_PERMISSIVE_ENTITLEMENTS when the org has no subscription
// (matches the same fallback used by the subscription middleware).
//
// Workers (chat-worker, ai-usage-aggregator) call this to gate quotas without
// a request-bound context. For HTTP handlers, prefer the cached snapshot via
// getSubscriptionFromCache in apps/server/src/lib/subscription-cache.ts.
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
