import { z } from 'zod'

const VALID_PRESETS = ['7d', '30d', '90d', '6m'] as const

export const dashboardStatsQuerySchema = z.object({
  preset: z.enum(VALID_PRESETS).default('30d'),
})

export type DashboardPreset = (typeof VALID_PRESETS)[number]

export function presetToDays(preset: DashboardPreset): number {
  const map: Record<DashboardPreset, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '6m': 180,
  }
  return map[preset]
}
