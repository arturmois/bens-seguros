'use client'

import { useGetDashboardStats } from '@/api/endpoints/stats/stats'
import { getActiveOrgCookie } from '@/lib/org-cookie'

import type { DashboardPreset } from '../lib/constants'

export function useDashboardStats(preset: DashboardPreset = '30d') {
  // Defense-in-depth: DashboardShell already gates rendering on activeOrg,
  // but we also guard here via cookie to prevent requests without tenant context.
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
