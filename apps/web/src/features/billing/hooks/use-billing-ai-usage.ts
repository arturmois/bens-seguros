'use client'

import { useGetBillingAiUsage } from '@/api/endpoints/billing/billing'

interface UseBillingAiUsageArgs {
  readonly days?: number
}

export function useBillingAiUsage({ days = 30 }: UseBillingAiUsageArgs = {}) {
  return useGetBillingAiUsage(
    { days },
    {
      query: {
        staleTime: 30_000,
        select: (response) => response.data.data,
      },
    }
  )
}
