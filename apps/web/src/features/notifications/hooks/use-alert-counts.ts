'use client'

import { api } from '@/lib/api-client'
import { useQuery } from '@tanstack/react-query'

interface AlertCounts {
  readonly Policy: number
  readonly Claim: number
  readonly Commission: number
  readonly Proposal: number
}

export function useAlertCounts() {
  return useQuery({
    queryKey: ['notifications', 'alert-counts'],
    queryFn: async () => {
      const res = await api.get<AlertCounts>(
        '/api/v1/notifications/alert-counts'
      )
      return res.data
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
