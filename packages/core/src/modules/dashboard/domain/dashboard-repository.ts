import type {
  DashboardPreset,
  DashboardSnapshot,
} from './dashboard-snapshot.js'

export interface DashboardRepository {
  getSnapshot(
    organizationId: string,
    preset: DashboardPreset
  ): Promise<DashboardSnapshot>
}
