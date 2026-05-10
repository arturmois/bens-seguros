import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import type { DashboardRepository } from '../domain/dashboard-repository.js'
import type {
  DashboardPreset,
  DashboardSnapshot,
} from '../domain/dashboard-snapshot.js'

const DASHBOARD_CACHE_TTL_SECONDS = 60

@injectable()
export class BuildDashboardSnapshot {
  constructor(
    @inject('DashboardRepository')
    private readonly dashboardRepo: DashboardRepository,
    @inject('CacheService') private readonly cache: CacheService
  ) {}

  async execute(
    organizationId: string,
    preset: DashboardPreset
  ): Promise<DashboardSnapshot> {
    const cacheKey = `dashboard:stats:${organizationId}:${preset}`
    const cached = await this.cache.get<DashboardSnapshot>(cacheKey)
    if (cached) {
      return cached
    }
    const snapshot = await this.dashboardRepo.getSnapshot(
      organizationId,
      preset
    )
    await this.cache.set(cacheKey, snapshot, DASHBOARD_CACHE_TTL_SECONDS)
    return snapshot
  }
}
