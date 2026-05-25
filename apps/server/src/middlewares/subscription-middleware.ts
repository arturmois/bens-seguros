import { buildEntitlements } from '@repo/core'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'
import {
  getSubscriptionFromCache,
  type SubscriptionSnapshot,
} from '../lib/subscription-cache.js'

// Paths exempt from the subscription check. Billing and auth routes must work
// even when subscription is EXPIRED — otherwise the user has no way to
// reactivate. Webhooks and health checks are open by definition. Internal
// admin routes have their own super-admin gate (requireSuperAdmin + SE4a 2FA).
const EXEMPT_PATH_PREFIXES = [
  '/api/auth/',
  '/api/v1/billing/',
  '/health',
  '/api/webhooks/',
  '/api/internal/admin/',
] as const

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

interface BlockReason {
  readonly status: 402
  readonly code: string
  readonly message: string
}

// Pure status evaluation (no I/O, no clock injection at call sites — `now`
// passed in for testability).
export function evaluateSubscriptionAccess(
  snapshot: SubscriptionSnapshot | null,
  now: Date
): BlockReason | null {
  if (!snapshot) {
    return {
      status: 402,
      code: 'NO_SUBSCRIPTION',
      message: 'Organization has no active subscription',
    }
  }

  switch (snapshot.status) {
    case 'ACTIVE':
    case 'BILLED_EXTERNALLY':
      return null

    case 'TRIALING':
      // trialEndsAt: null is rare but valid (super-admin grant via SE4
      // extend-trial sets a date; orgs in BILLED_EXTERNALLY-to-trial flip
      // may not). Treat null as "trial has no defined end" — pass through.
      // Worker `trial-expiry` (Fase 6) is responsible for setting/flipping
      // status to ACTIVE or EXPIRED based on policy.
      if (snapshot.trialEndsAt && now > snapshot.trialEndsAt) {
        return {
          status: 402,
          code: 'TRIAL_EXPIRED',
          message: 'Trial period has ended',
        }
      }
      return null

    case 'CANCELED':
      // CANCELED keeps access until currentPeriodEnd; after that, expired
      // worker flips status to EXPIRED. Defensive check here covers the
      // window before the worker runs. currentPeriodEnd: null treated as
      // "still in grace" — worker normalizes this on next tick.
      if (snapshot.currentPeriodEnd && now > snapshot.currentPeriodEnd) {
        return {
          status: 402,
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Subscription has expired',
        }
      }
      return null

    case 'PAST_DUE':
      return {
        status: 402,
        code: 'SUBSCRIPTION_PAST_DUE',
        message: 'Subscription payment is past due',
      }

    case 'EXPIRED':
      return {
        status: 402,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Subscription has expired',
      }
  }
}

export function createSubscriptionMiddleware(redis: IORedis) {
  return async function subscriptionMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const pathname = request.url.split('?')[0] ?? request.url
    if (isExemptPath(pathname)) return

    const organizationId = request.organizationId
    if (!organizationId) {
      // Tenant middleware should have rejected already. Defensive bail-out.
      return
    }

    const snapshot = await getSubscriptionFromCache(redis, organizationId)
    const block = evaluateSubscriptionAccess(snapshot, new Date())

    if (block) {
      await reply.status(block.status).send({
        success: false,
        error: {
          code: block.code,
          message: block.message,
        },
      })
      return
    }

    // Snapshot is non-null here (block would have been NO_SUBSCRIPTION).
    if (!snapshot) return

    request.subscription = snapshot
    request.entitlements = buildEntitlements(
      {
        status: snapshot.status,
        trialEndsAt: snapshot.trialEndsAt,
        billingManagedExternally: snapshot.billingManagedExternally,
        customQuotas: snapshot.customQuotas,
      },
      snapshot.plan
    )
  }
}
