import type IORedis from 'ioredis'
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'
import type { SubscriptionSnapshot } from '../../../../lib/subscription-cache.js'

const getFromCacheMock = vi.fn()

vi.mock('../../../../lib/subscription-cache.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../lib/subscription-cache.js')
  >('../../../../lib/subscription-cache.js')
  return {
    ...actual,
    getSubscriptionFromCache: (...args: unknown[]) => getFromCacheMock(...args),
  }
})

const { getBillingCurrentRoute } = await import('../get-current.js')

const fakeRedis = {} as unknown as IORedis

let app: Awaited<ReturnType<typeof createTestApp>>

function makeSnapshot(
  overrides: Partial<SubscriptionSnapshot> = {}
): SubscriptionSnapshot {
  return {
    id: 'sub-1',
    organizationId: 'org-test-00000000-0000-0000-0000-000000000001',
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

beforeAll(async () => {
  app = await createTestApp((appInstance) =>
    getBillingCurrentRoute(appInstance, fakeRedis)
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/billing/current', () => {
  it('returns 200 with subscription + entitlements when snapshot exists', async () => {
    getFromCacheMock.mockResolvedValue(makeSnapshot())
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/current',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.subscription?.id).toBe('sub-1')
    expect(body.data.subscription?.plan.slug).toBe('business')
    expect(body.data.entitlements.isActive).toBe(true)
    expect(body.data.entitlements.aiEnabled).toBe(true)
  })

  it('returns 200 with null subscription + permissive entitlements when no snapshot', async () => {
    getFromCacheMock.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/current',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.subscription).toBeNull()
    expect(body.data.entitlements.billingManagedExternally).toBe(true)
    expect(body.data.entitlements.isActive).toBe(true)
  })

  it('serializes trialEndsAt and currentPeriodEnd as ISO strings', async () => {
    getFromCacheMock.mockResolvedValue(
      makeSnapshot({
        status: 'TRIALING',
        trialEndsAt: new Date('2026-06-15T12:00:00Z'),
      })
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/current',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.subscription?.trialEndsAt).toBe('2026-06-15T12:00:00.000Z')
    expect(body.data.entitlements.trialEndsAt).toBe('2026-06-15T12:00:00.000Z')
    expect(body.data.entitlements.isTrialing).toBe(true)
  })

  it('reflects BILLED_EXTERNALLY status', async () => {
    getFromCacheMock.mockResolvedValue(
      makeSnapshot({
        status: 'BILLED_EXTERNALLY',
        billingManagedExternally: true,
      })
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/current',
    })
    const body = response.json()
    expect(body.data.subscription?.status).toBe('BILLED_EXTERNALLY')
    expect(body.data.entitlements.billingManagedExternally).toBe(true)
  })

  it('reads from cache using request organizationId', async () => {
    getFromCacheMock.mockResolvedValue(makeSnapshot())
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/current',
    })
    expect(getFromCacheMock).toHaveBeenCalledWith(
      fakeRedis,
      'org-test-00000000-0000-0000-0000-000000000001'
    )
  })
})
