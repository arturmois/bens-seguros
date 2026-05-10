import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { container } from '@repo/core'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { getDashboardStatsRoute } from '../get-dashboard-stats.js'

vi.mock('../stats-helpers.js', () => ({
  buildDashboardData: vi.fn(),
}))

import { buildDashboardData } from '../stats-helpers.js'

const makeDashboardData = () => ({
  proposalsByStage: [{ stage: 'CAPTURE', _count: 5 }],
  activePolicies: 10,
  expiringPolicies: 2,
  renewalsNext7Days: 1,
  claimsByPriority: [{ priority: 'NORMAL', _count: 3 }],
  commissionsThisMonth: [
    {
      status: 'PENDING_ADMIN',
      _count: 4,
      _sum: { commissionValueInCents: 50000 },
    },
  ],
  conversionRate: { total: 20, issued: 8, rate: 40 },
  monthlyTrends: [{ month: '2025-01', proposals: 10, issued: 4 }],
  comparison: {
    proposals: { current: 10, previous: 8, changePercent: 25 },
    policies: { current: 5, previous: 4, changePercent: 25 },
    claims: { current: 3, previous: 2, changePercent: 50 },
    commissionsPending: { current: 50000, previous: 40000, changePercent: 25 },
  },
  totalPremium: { current: 200000, previous: 150000, changePercent: 33 },
  averageTicket: { current: 40000, previous: 37500, changePercent: 7 },
  commissionsReceivable: 120000,
  ranking: [
    {
      salespersonId: 'user-001',
      salespersonName: 'Vendedor Teste',
      policiesIssued: 5,
      totalPremiumCents: 200000,
      averageTicketCents: 40000,
    },
  ],
  newInsurance: { current: 0, previous: 0, changePercent: 0 },
  renewal7dPremiumCents: 0,
  warnings: { total: 0, claimsOpen: 0, assistancesOpen: 0 },
  proposalsPending: { total: 0, inDay: 0, warning: 0, critical: 0 },
})

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getDashboardStatsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockCache.get.mockResolvedValue(null)
  mockCache.set.mockResolvedValue(undefined)
  vi.mocked(buildDashboardData).mockResolvedValue(makeDashboardData())
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (token === 'CacheService') return mockCache
    return null
  })
})

describe('GET /api/v1/stats/dashboard', () => {
  it('returns dashboard stats with default 30d preset', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/stats/dashboard',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.activePolicies).toBe(10)
    expect(body.data.proposalsByStage).toHaveLength(1)
    expect(body.data.ranking).toHaveLength(1)
    expect(vi.mocked(buildDashboardData)).toHaveBeenCalledWith(
      TEST_ORG_ID,
      '30d'
    )
  })
  it('returns dashboard stats for specified preset', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/stats/dashboard',
      query: { preset: '7d' },
    })
    expect(response.statusCode).toBe(200)
    expect(vi.mocked(buildDashboardData)).toHaveBeenCalledWith(
      TEST_ORG_ID,
      '7d'
    )
  })
  it('returns cached data when cache hit occurs', async () => {
    const cached = makeDashboardData()
    mockCache.get.mockResolvedValue(cached)
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/stats/dashboard',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(vi.mocked(buildDashboardData)).not.toHaveBeenCalled()
  })
  it('stores result in cache after fetching fresh data', async () => {
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/stats/dashboard',
    })
    expect(mockCache.set).toHaveBeenCalledWith(
      expect.stringContaining(`dashboard:stats:${TEST_ORG_ID}`),
      expect.objectContaining({ activePolicies: 10 }),
      60
    )
  })
  it('rejects invalid preset value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/stats/dashboard',
      query: { preset: 'invalid' },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
})
