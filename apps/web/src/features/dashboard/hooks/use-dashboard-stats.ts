'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'

import type { DashboardStats } from '../types'

const DASHBOARD_STATS_KEY = 'dashboard-stats'

export function useDashboardStats() {
  return useQuery({
    queryKey: [DASHBOARD_STATS_KEY],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/api/v1/stats/dashboard')
      return response.data
    },
    staleTime: 60_000,
  })
}
