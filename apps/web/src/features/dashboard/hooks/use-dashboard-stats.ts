'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import { getActiveOrgCookie } from '@/lib/org-cookie'

import type { DashboardStats } from '../types'

const DASHBOARD_STATS_KEY = 'dashboard-stats'

export function useDashboardStats() {
  // Defense-in-depth: DashboardShell already gates rendering on activeOrg,
  // but we also guard here via cookie to prevent requests without tenant context.
  const hasActiveOrg = !!getActiveOrgCookie()

  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/api/v1/stats/dashboard')
      return response.data
    },
    staleTime: 60_000,
    enabled: hasActiveOrg,
  })
}
