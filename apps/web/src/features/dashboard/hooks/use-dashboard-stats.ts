'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import { getGetDashboardStatsQueryKey } from '@/api/endpoints/stats/stats'
import { getActiveOrgCookie } from '@/lib/org-cookie'

import type { DashboardPreset, DashboardStats } from '../types'

export function useDashboardStats(preset: DashboardPreset = '30d') {
  // Defense-in-depth: DashboardShell already gates rendering on activeOrg,
  // but we also guard here via cookie to prevent requests without tenant context.
  const hasActiveOrg = !!getActiveOrgCookie()

  return useQuery({
    queryKey: getGetDashboardStatsQueryKey({ preset }),
    queryFn: async () => {
      const response = await api.get<DashboardStats>(
        `/api/v1/stats/dashboard?preset=${preset}`
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: hasActiveOrg,
  })
}
