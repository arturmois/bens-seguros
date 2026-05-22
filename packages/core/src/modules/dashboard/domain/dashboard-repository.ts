import type {
  DashboardPreset,
  DashboardSnapshot,
} from './dashboard-snapshot.js'

export interface PremiumByMonthEntry {
  readonly month: number
  readonly boardType: 'NEW_INSURANCE' | 'RENEWAL'
  readonly realizedCents: number
}

export interface DashboardRepository {
  getSnapshot(
    organizationId: string,
    preset: DashboardPreset
  ): Promise<DashboardSnapshot>

  getPremiumByMonthAndBoardType(
    organizationId: string,
    year: number
  ): Promise<readonly PremiumByMonthEntry[]>
}
