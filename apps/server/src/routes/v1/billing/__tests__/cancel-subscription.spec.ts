import type { BillingProvider } from '@repo/billing-port'
import type IORedis from 'ioredis'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'

const findUniqueMock = vi.fn()
const updateMock = vi.fn()

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    prismaAdmin: {
      get subscription() {
        return { findUnique: findUniqueMock, update: updateMock }
      },
    },
  }
})

const invalidateCacheMock = vi.fn()
vi.mock('../../../../lib/subscription-cache.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../lib/subscription-cache.js')
  >('../../../../lib/subscription-cache.js')
  return {
    ...actual,
    invalidateSubscriptionCache: (...args: unknown[]) =>
      invalidateCacheMock(...args),
  }
})

const { cancelBillingSubscriptionRoute } =
  await import('../cancel-subscription.js')

const fakeRedis = {} as unknown as IORedis

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    organizationId: 'org-test-00000000-0000-0000-0000-000000000001',
    planId: 'plan-1',
    status: 'ACTIVE' as const,
    billingProvider: 'ASAAS' as const,
    billingProviderCustomerId: 'asaas-cust-1',
    billingProviderSubscriptionId: 'asaas-sub-1',
    currentPeriodStart: new Date('2026-05-01T00:00:00Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00Z'),
    trialEndsAt: null,
    canceledAt: null,
    endedAt: null,
    aiOverageConfig: null,
    customQuotas: null,
    customQuotasVersion: 1,
    billingManagedExternally: false,
    externalNotes: null,
    createdAt: new Date('2026-04-01T00:00:00Z'),
    updatedAt: new Date('2026-05-01T00:00:00Z'),
    ...overrides,
  }
}

function makeProvider(): BillingProvider & {
  cancelSubscription: ReturnType<typeof vi.fn>
} {
  return {
    createCustomer: vi.fn(),
    createSubscription: vi.fn(),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
    changeSubscriptionPlan: vi.fn(),
    tokenizeCard: vi.fn(),
    validateAndParseWebhook: vi.fn(),
  } as unknown as BillingProvider & {
    cancelSubscription: ReturnType<typeof vi.fn>
  }
}

let app: Awaited<ReturnType<typeof createTestApp>>
let provider: ReturnType<typeof makeProvider>

beforeAll(async () => {
  provider = makeProvider()
  app = await createTestApp((appInstance) =>
    cancelBillingSubscriptionRoute(appInstance, provider, fakeRedis)
  )
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('POST /api/v1/billing/cancel-subscription', () => {
  it('cancels via provider, updates DB to CANCELED, invalidates cache', async () => {
    findUniqueMock.mockResolvedValue(makeSubscription())
    updateMock.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(makeSubscription({ ...data }))
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.canceledAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
    expect(body.data.currentPeriodEnd).toBe('2026-06-01T00:00:00.000Z')
    expect(provider.cancelSubscription).toHaveBeenCalledWith({
      provider: 'asaas',
      externalId: 'asaas-sub-1',
      customerRef: { provider: 'asaas', externalId: 'asaas-cust-1' },
    })
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'CANCELED' }),
      })
    )
    expect(invalidateCacheMock).toHaveBeenCalledWith(
      fakeRedis,
      'org-test-00000000-0000-0000-0000-000000000001'
    )
  })

  it('returns 404 when no subscription exists', async () => {
    findUniqueMock.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('SUBSCRIPTION_NOT_FOUND')
    expect(provider.cancelSubscription).not.toHaveBeenCalled()
  })

  it('returns 403 when subscription is billingManagedExternally', async () => {
    findUniqueMock.mockResolvedValue(
      makeSubscription({
        billingManagedExternally: true,
        status: 'BILLED_EXTERNALLY',
      })
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('SUBSCRIPTION_MANAGED_EXTERNALLY')
    expect(provider.cancelSubscription).not.toHaveBeenCalled()
  })

  it('returns 400 when subscription is already CANCELED', async () => {
    findUniqueMock.mockResolvedValue(makeSubscription({ status: 'CANCELED' }))
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('SUBSCRIPTION_ALREADY_CANCELED')
    expect(provider.cancelSubscription).not.toHaveBeenCalled()
  })

  it('returns 400 when subscription is EXPIRED', async () => {
    findUniqueMock.mockResolvedValue(makeSubscription({ status: 'EXPIRED' }))
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('SUBSCRIPTION_ALREADY_CANCELED')
  })

  it('cancels TRIALING subscription successfully', async () => {
    findUniqueMock.mockResolvedValue(makeSubscription({ status: 'TRIALING' }))
    updateMock.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(makeSubscription({ ...data }))
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(200)
    expect(provider.cancelSubscription).toHaveBeenCalled()
  })

  it('cancels PAST_DUE subscription successfully', async () => {
    findUniqueMock.mockResolvedValue(makeSubscription({ status: 'PAST_DUE' }))
    updateMock.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(makeSubscription({ ...data }))
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(200)
    expect(provider.cancelSubscription).toHaveBeenCalled()
  })

  it('returns 502 when provider throws during cancel', async () => {
    findUniqueMock.mockResolvedValue(makeSubscription())
    provider.cancelSubscription.mockRejectedValueOnce(
      new Error('asaas timeout')
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(502)
    expect(response.json().error.code).toBe('BILLING_PROVIDER_ERROR')
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('skips provider call when billingProviderSubscriptionId is null but still updates DB', async () => {
    findUniqueMock.mockResolvedValue(
      makeSubscription({
        billingProviderSubscriptionId: null,
        billingProviderCustomerId: null,
      })
    )
    updateMock.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(makeSubscription({ ...data }))
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(200)
    expect(provider.cancelSubscription).not.toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalled()
    expect(invalidateCacheMock).toHaveBeenCalled()
  })
})

describe('POST /api/v1/billing/cancel-subscription with null provider', () => {
  let appNoProvider: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    appNoProvider = await createTestApp((appInstance) =>
      cancelBillingSubscriptionRoute(appInstance, null, fakeRedis)
    )
  })

  afterAll(() => appNoProvider.close())

  it('returns 503 when billing provider is unavailable', async () => {
    findUniqueMock.mockResolvedValue(makeSubscription())
    const response = await injectAs(appNoProvider, {
      method: 'POST',
      url: '/api/v1/billing/cancel-subscription',
      payload: {},
    })
    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe('BILLING_PROVIDER_UNAVAILABLE')
  })
})
