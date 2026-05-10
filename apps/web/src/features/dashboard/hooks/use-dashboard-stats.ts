'use client'

import { useGetDashboardStats } from '@/api/endpoints/stats/stats'
import { getActiveOrgCookie } from '@/lib/org-cookie'

import type { DashboardPreset } from '../lib/constants'

export function useDashboardStats(preset: DashboardPreset = '30d') {
  const hasActiveOrg = !!getActiveOrgCookie()
  return useGetDashboardStats(
    { preset },
    {
      query: {
        enabled: hasActiveOrg,
        select: (response) => response.data.data,
      },
    }
  )
}
