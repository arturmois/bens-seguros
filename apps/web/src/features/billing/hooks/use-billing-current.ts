'use client'

import { useGetBillingCurrent } from '@/api/endpoints/billing/billing'

export function useBillingCurrent() {
  return useGetBillingCurrent({
    query: {
      staleTime: 30_000,
      select: (response) => response.data.data,
    },
  })
}
