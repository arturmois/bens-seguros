'use client'

import { useGetAlertCounts } from '@/api/endpoints/notifications/notifications'

export interface AlertCounts {
  readonly Policy: number
  readonly Claim: number
  readonly Commission: number
  readonly Proposal: number
  readonly [key: string]: number
}

export function useAlertCounts() {
  return useGetAlertCounts({
    query: {
      staleTime: 60_000,
      refetchInterval: 60_000,
      select: (response) => response.data.data,
    },
  })
}
