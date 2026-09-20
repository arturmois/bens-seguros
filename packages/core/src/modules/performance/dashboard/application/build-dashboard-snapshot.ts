import { inject, injectable } from 'tsyringe'
import { cacheAside } from '../../../../shared/cache-aside.js'
import type { CacheService } from '../../../../shared/cache-service.js'
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
    return cacheAside(
      this.cache,
      `dashboard:stats:${organizationId}:${preset}`,
      DASHBOARD_CACHE_TTL_SECONDS,
      () => this.dashboardRepo.getSnapshot(organizationId, preset)
    )
  }
}
