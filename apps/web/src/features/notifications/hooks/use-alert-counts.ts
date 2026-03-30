'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import { getGetAlertCountsQueryKey } from '@/api/endpoints/notifications/notifications'

export interface AlertCounts {
  readonly Policy: number
  readonly Claim: number
  readonly Commission: number
  readonly Proposal: number
  readonly [key: string]: number
}

export function useAlertCounts() {
  return useQuery({
    queryKey: getGetAlertCountsQueryKey(),
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
