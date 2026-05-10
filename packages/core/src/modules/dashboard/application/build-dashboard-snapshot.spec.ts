import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../shared/cache-service.js'
import type { DashboardRepository } from '../domain/dashboard-repository.js'
import type { DashboardSnapshot } from '../domain/dashboard-snapshot.js'
import { BuildDashboardSnapshot } from './build-dashboard-snapshot.js'

function emptySnapshot(): DashboardSnapshot {
  return {
    proposalsByStage: [],
    activePolicies: 0,
    expiringPolicies: 0,
    renewalsNext7Days: 0,
    claimsByPriority: [],
    commissionsThisMonth: [],
    conversionRate: { total: 0, issued: 0, rate: 0 },
    monthlyTrends: [],
    comparison: {
      proposals: { current: 0, previous: 0, changePercent: 0 },
      policies: { current: 0, previous: 0, changePercent: 0 },
      claims: { current: 0, previous: 0, changePercent: 0 },
      commissionsPending: { current: 0, previous: 0, changePercent: 0 },
    },
    totalPremium: { current: 0, previous: 0, changePercent: 0 },
    averageTicket: { current: 0, previous: 0, changePercent: 0 },
    commissionsReceivable: 0,
    ranking: [],
    newInsurance: { current: 0, previous: 0, changePercent: 0 },
    renewal7dPremiumCents: 0,
    warnings: { total: 0, claimsOpen: 0, assistancesOpen: 0 },
    proposalsPending: { total: 0, inDay: 0, warning: 0, critical: 0 },
  }
}

function makeMocks() {
  const repo: DashboardRepository = { getSnapshot: vi.fn() }
  const cache: CacheService = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }
  return { repo, cache }
}

describe('BuildDashboardSnapshot.execute', () => {
  it('returns the cached snapshot without calling the repo on cache hit', async () => {
    const { repo, cache } = makeMocks()
    const cached = emptySnapshot()
    vi.mocked(cache.get).mockResolvedValue(cached)
    const useCase = new BuildDashboardSnapshot(repo, cache)
    const result = await useCase.execute('org-1', '30d')
    expect(result).toBe(cached)
    expect(vi.mocked(repo.getSnapshot)).not.toHaveBeenCalled()
    expect(vi.mocked(cache.set)).not.toHaveBeenCalled()
  })
  it('falls through to the repo on cache miss and populates the cache', async () => {
    const { repo, cache } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue(null)
    const fresh = emptySnapshot()
    vi.mocked(repo.getSnapshot).mockResolvedValue(fresh)
    const useCase = new BuildDashboardSnapshot(repo, cache)
    const result = await useCase.execute('org-1', '7d')
    expect(result).toBe(fresh)
    expect(vi.mocked(repo.getSnapshot)).toHaveBeenCalledWith('org-1', '7d')
    expect(vi.mocked(cache.set)).toHaveBeenCalledWith(
      'dashboard:stats:org-1:7d',
      fresh,
      60
    )
  })
  it('uses preset-specific cache keys', async () => {
    const { repo, cache } = makeMocks()
    vi.mocked(cache.get).mockResolvedValue(null)
    vi.mocked(repo.getSnapshot).mockResolvedValue(emptySnapshot())
    const useCase = new BuildDashboardSnapshot(repo, cache)
    await useCase.execute('org-1', '6m')
    expect(vi.mocked(cache.get)).toHaveBeenCalledWith(
      'dashboard:stats:org-1:6m'
    )
  })
})
