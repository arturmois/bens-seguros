import { prismaAdmin } from '@repo/db'
import type IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({ name: 'subscription-cache' })

// Snapshot stored in Redis. Plan is embedded (denormalized) so subscription
// middleware doesn't need a second query per cache miss. Trade-off: writes to
// Plan must invalidate every Subscription using that plan (handled by SE5 —
// Plan writes are super-admin only and infrequent).
export interface SubscriptionSnapshot {
  readonly id: string
  readonly organizationId: string
  readonly status: SubscriptionStatus
  readonly billingManagedExternally: boolean
  readonly customQuotas: Readonly<Record<string, unknown>> | null
  readonly trialEndsAt: Date | null
  readonly currentPeriodEnd: Date | null
  readonly plan: {
    readonly slug: string
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
}

type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED'
  | 'BILLED_EXTERNALLY'

export const SUBSCRIPTION_CACHE_TTL_SECONDS = 30
export const SUBSCRIPTION_CACHE_PREFIX = 'sub:'
export const SUBSCRIPTION_INVALIDATION_CHANNEL = 'subscription:invalidated'

function cacheKey(organizationId: string): string {
  return `${SUBSCRIPTION_CACHE_PREFIX}${organizationId}`
}

interface SerializedSnapshot {
  readonly id: string
  readonly organizationId: string
  readonly status: SubscriptionStatus
  readonly billingManagedExternally: boolean
  readonly customQuotas: Record<string, unknown> | null
  readonly trialEndsAt: string | null
  readonly currentPeriodEnd: string | null
  readonly plan: SubscriptionSnapshot['plan']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function serialize(snapshot: SubscriptionSnapshot): string {
  const payload: SerializedSnapshot = {
    id: snapshot.id,
    organizationId: snapshot.organizationId,
    status: snapshot.status,
    billingManagedExternally: snapshot.billingManagedExternally,
    customQuotas: snapshot.customQuotas ? { ...snapshot.customQuotas } : null,
    trialEndsAt: snapshot.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: snapshot.currentPeriodEnd?.toISOString() ?? null,
    plan: snapshot.plan,
  }
  return JSON.stringify(payload)
}

function isSerializedSnapshot(value: unknown): value is SerializedSnapshot {
  if (!isRecord(value)) return false
  return (
    typeof value['id'] === 'string' &&
    typeof value['organizationId'] === 'string' &&
    typeof value['status'] === 'string' &&
    typeof value['billingManagedExternally'] === 'boolean' &&
    isRecord(value['plan'])
  )
}

function deserialize(raw: string): SubscriptionSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isSerializedSnapshot(parsed)) {
      logger.warn(
        { rawPreview: raw.slice(0, 200) },
        'subscription cache: deserialization shape mismatch'
      )
      return null
    }
    return {
      id: parsed.id,
      organizationId: parsed.organizationId,
      status: parsed.status,
      billingManagedExternally: parsed.billingManagedExternally,
      customQuotas: parsed.customQuotas,
      trialEndsAt: parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : null,
      currentPeriodEnd: parsed.currentPeriodEnd
        ? new Date(parsed.currentPeriodEnd)
        : null,
      plan: parsed.plan,
    }
  } catch (error) {
    logger.warn(
      { err: error, rawPreview: raw.slice(0, 200) },
      'subscription cache: deserialization failed'
    )
    return null
  }
}

async function loadFromDatabase(
  organizationId: string
): Promise<SubscriptionSnapshot | null> {
  const subscription = await prismaAdmin.subscription.findUnique({
    where: { organizationId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      billingManagedExternally: true,
      customQuotas: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      plan: {
        select: {
          slug: true,
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
      },
    },
  })

  if (!subscription) return null

  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    status: subscription.status,
    billingManagedExternally: subscription.billingManagedExternally,
    customQuotas: isRecord(subscription.customQuotas)
      ? subscription.customQuotas
      : null,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    plan: {
      slug: subscription.plan.slug,
      maxUsers: subscription.plan.maxUsers,
      maxProposalsPerMonth: subscription.plan.maxProposalsPerMonth,
      maxChannels: subscription.plan.maxChannels,
      maxConversationsPerOrg: subscription.plan.maxConversationsPerOrg,
      maxImportRows: subscription.plan.maxImportRows,
      maxLogoSizeBytes: subscription.plan.maxLogoSizeBytes,
      aiEnabled: subscription.plan.aiEnabled,
      aiMessagesIncluded: subscription.plan.aiMessagesIncluded,
      aiOverageCentsPerMessage: subscription.plan.aiOverageCentsPerMessage,
      features: isRecord(subscription.plan.features)
        ? subscription.plan.features
        : {},
    },
  }
}

// Reads subscription via cache (Redis 30s TTL). Miss falls back to Postgres
// (DATABASE_ADMIN_URL so RLS isn't an issue — middleware runs with the request
// organizationId but the Subscription table is the org's own row).
export async function getSubscriptionFromCache(
  redis: IORedis,
  organizationId: string
): Promise<SubscriptionSnapshot | null> {
  const cached = await redis.get(cacheKey(organizationId))
  if (cached) {
    const parsed = deserialize(cached)
    if (parsed) return parsed
  }
  const fresh = await loadFromDatabase(organizationId)
  if (fresh) {
    await redis.set(
      cacheKey(organizationId),
      serialize(fresh),
      'EX',
      SUBSCRIPTION_CACHE_TTL_SECONDS
    )
  }
  return fresh
}

// Drops the cache entry for one org and broadcasts on pub/sub so other server
// processes (multi-instance) drop their in-memory copies too.
export async function invalidateSubscriptionCache(
  redis: IORedis,
  organizationId: string
): Promise<void> {
  await redis.del(cacheKey(organizationId))
  await redis.publish(SUBSCRIPTION_INVALIDATION_CHANNEL, organizationId)
}
