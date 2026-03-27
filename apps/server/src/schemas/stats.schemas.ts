import { z } from 'zod'

const VALID_PRESETS = ['7d', '15d', '30d', '90d'] as const

export const dashboardStatsQuerySchema = z.object({
  preset: z.enum(VALID_PRESETS).default('30d'),
})

export type DashboardPreset = (typeof VALID_PRESETS)[number]

export function presetToDays(preset: DashboardPreset): number {
  const map: Record<DashboardPreset, number> = {
    '7d': 7,
    '15d': 15,
    '30d': 30,
    '90d': 90,
  }
  return map[preset]
}
