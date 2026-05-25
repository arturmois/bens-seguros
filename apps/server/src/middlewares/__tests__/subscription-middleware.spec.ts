import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubscriptionSnapshot } from '../../lib/subscription-cache.js'

const getFromCacheMock = vi.fn()

vi.mock('../../lib/subscription-cache.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../lib/subscription-cache.js')
  >('../../lib/subscription-cache.js')
  return {
    ...actual,
    getSubscriptionFromCache: (...args: unknown[]) => getFromCacheMock(...args),
  }
})

const { createSubscriptionMiddleware, evaluateSubscriptionAccess } =
  await import('../subscription-middleware.js')

const fakeRedis = {} as unknown as IORedis

function makeReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue(undefined),
  }
  return reply as unknown as FastifyReply
}

function makeRequest(
  url: string,
  organizationId: string | null = 'org-1'
): FastifyRequest {
  const value = organizationId ?? undefined
  return { url, organizationId: value } as unknown as FastifyRequest
}

function makeSnapshot(
  overrides: Partial<SubscriptionSnapshot> = {}
): SubscriptionSnapshot {
  return {
    id: 'sub-1',
    organizationId: 'org-1',
    status: 'ACTIVE',
    billingManagedExternally: false,
    customQuotas: null,
    trialEndsAt: null,
    currentPeriodEnd: new Date('2027-01-01T00:00:00Z'),
    plan: {
      slug: 'business',
      maxUsers: null,
      maxProposalsPerMonth: null,
      maxChannels: null,
      maxConversationsPerOrg: null,
      maxImportRows: null,
      maxLogoSizeBytes: 5 * 1024 * 1024,
      aiEnabled: true,
      aiMessagesIncluded: 5000,
      aiOverageCentsPerMessage: 15,
      features: {
        customBranding: true,
        advancedReports: true,
        apiAccess: true,
        prioritySupport: true,
      },
    },
    ...overrides,
  }
}

describe('evaluateSubscriptionAccess (pure)', () => {
  const now = new Date('2026-05-24T22:00:00Z')

  it('blocks with NO_SUBSCRIPTION when snapshot is null', () => {
    expect(evaluateSubscriptionAccess(null, now)).toEqual({
      status: 402,
      code: 'NO_SUBSCRIPTION',
      message: 'Organization has no active subscription',
    })
  })

  it('passes ACTIVE', () => {
    expect(
      evaluateSubscriptionAccess(makeSnapshot({ status: 'ACTIVE' }), now)
    ).toBeNull()
  })

  it('passes BILLED_EXTERNALLY', () => {
    expect(
      evaluateSubscriptionAccess(
        makeSnapshot({
          status: 'BILLED_EXTERNALLY',
          billingManagedExternally: true,
        }),
        now
      )
    ).toBeNull()
  })

  it('passes TRIALING when trialEndsAt is in the future', () => {
    expect(
      evaluateSubscriptionAccess(
        makeSnapshot({
          status: 'TRIALING',
          trialEndsAt: new Date('2026-06-15T00:00:00Z'),
        }),
        now
      )
    ).toBeNull()
  })

  it('blocks TRIALING after trialEndsAt with TRIAL_EXPIRED', () => {
    const block = evaluateSubscriptionAccess(
      makeSnapshot({
        status: 'TRIALING',
        trialEndsAt: new Date('2026-05-01T00:00:00Z'),
      }),
      now
    )
    expect(block?.code).toBe('TRIAL_EXPIRED')
  })

  it('passes TRIALING when trialEndsAt is null (no defined end — worker will normalize)', () => {
    expect(
      evaluateSubscriptionAccess(
        makeSnapshot({ status: 'TRIALING', trialEndsAt: null }),
        now
      )
    ).toBeNull()
  })

  it('passes CANCELED before currentPeriodEnd', () => {
    expect(
      evaluateSubscriptionAccess(
        makeSnapshot({
          status: 'CANCELED',
          currentPeriodEnd: new Date('2026-06-30T00:00:00Z'),
        }),
        now
      )
    ).toBeNull()
  })

  it('blocks CANCELED after currentPeriodEnd with SUBSCRIPTION_EXPIRED', () => {
    const block = evaluateSubscriptionAccess(
      makeSnapshot({
        status: 'CANCELED',
        currentPeriodEnd: new Date('2026-05-01T00:00:00Z'),
      }),
      now
    )
    expect(block?.code).toBe('SUBSCRIPTION_EXPIRED')
  })

  it('passes CANCELED when currentPeriodEnd is null (grace window)', () => {
    expect(
      evaluateSubscriptionAccess(
        makeSnapshot({ status: 'CANCELED', currentPeriodEnd: null }),
        now
      )
    ).toBeNull()
  })

  it('blocks PAST_DUE with SUBSCRIPTION_PAST_DUE', () => {
    const block = evaluateSubscriptionAccess(
      makeSnapshot({ status: 'PAST_DUE' }),
      now
    )
    expect(block?.code).toBe('SUBSCRIPTION_PAST_DUE')
  })

  it('blocks EXPIRED with SUBSCRIPTION_EXPIRED', () => {
    const block = evaluateSubscriptionAccess(
      makeSnapshot({ status: 'EXPIRED' }),
      now
    )
    expect(block?.code).toBe('SUBSCRIPTION_EXPIRED')
  })
})

describe('createSubscriptionMiddleware', () => {
  let middleware: ReturnType<typeof createSubscriptionMiddleware>

  beforeEach(() => {
    getFromCacheMock.mockReset()
    middleware = createSubscriptionMiddleware(fakeRedis)
  })

  describe('exempt paths', () => {
    const exempt = [
      '/api/auth/sign-in/email',
      '/api/v1/billing/current',
      '/health',
      '/api/webhooks/asaas',
      '/api/internal/admin/orgs/org-1/subscription',
    ]
    it.each(exempt)('skips %s without checking cache', async (url) => {
      const reply = makeReply()
      await middleware(makeRequest(url), reply)
      expect(getFromCacheMock).not.toHaveBeenCalled()
      expect(reply.status).not.toHaveBeenCalled()
    })

    it('handles query string on exempt paths', async () => {
      const reply = makeReply()
      await middleware(makeRequest('/api/auth/sign-in/email?ref=x'), reply)
      expect(getFromCacheMock).not.toHaveBeenCalled()
    })
  })

  describe('no organizationId', () => {
    it('returns without action (tenant middleware bailout case)', async () => {
      const reply = makeReply()
      await middleware(makeRequest('/api/v1/clients', null), reply)
      expect(getFromCacheMock).not.toHaveBeenCalled()
      expect(reply.status).not.toHaveBeenCalled()
    })
  })

  describe('subscription gating', () => {
    it('returns 402 NO_SUBSCRIPTION when snapshot is null', async () => {
      getFromCacheMock.mockResolvedValueOnce(null)
      const reply = makeReply()
      await middleware(makeRequest('/api/v1/clients'), reply)
      expect(reply.status).toHaveBeenCalledWith(402)
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'NO_SUBSCRIPTION' }),
        })
      )
    })

    it('returns 402 SUBSCRIPTION_EXPIRED for EXPIRED status', async () => {
      getFromCacheMock.mockResolvedValueOnce(
        makeSnapshot({ status: 'EXPIRED' })
      )
      const reply = makeReply()
      await middleware(makeRequest('/api/v1/clients'), reply)
      expect(reply.status).toHaveBeenCalledWith(402)
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SUBSCRIPTION_EXPIRED',
          }),
        })
      )
    })

    it('passes ACTIVE and injects subscription + entitlements', async () => {
      const snapshot = makeSnapshot({ status: 'ACTIVE' })
      getFromCacheMock.mockResolvedValueOnce(snapshot)
      const reply = makeReply()
      const request = makeRequest('/api/v1/clients')
      await middleware(request, reply)
      expect(reply.status).not.toHaveBeenCalled()
      expect(request.subscription).toBe(snapshot)
      expect(request.entitlements?.isActive).toBe(true)
      expect(request.entitlements?.aiEnabled).toBe(true)
    })

    it('passes BILLED_EXTERNALLY and injects entitlements with flag set', async () => {
      const snapshot = makeSnapshot({
        status: 'BILLED_EXTERNALLY',
        billingManagedExternally: true,
      })
      getFromCacheMock.mockResolvedValueOnce(snapshot)
      const reply = makeReply()
      const request = makeRequest('/api/v1/clients')
      await middleware(request, reply)
      expect(reply.status).not.toHaveBeenCalled()
      expect(request.entitlements?.billingManagedExternally).toBe(true)
    })

    it('reads from cache using request.organizationId', async () => {
      getFromCacheMock.mockResolvedValueOnce(makeSnapshot())
      await middleware(makeRequest('/api/v1/clients', 'org-7'), makeReply())
      expect(getFromCacheMock).toHaveBeenCalledWith(fakeRedis, 'org-7')
    })
  })
})
