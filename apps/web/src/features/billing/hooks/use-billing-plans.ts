'use client'

import { useListBillingPlans } from '@/api/endpoints/billing/billing'

export function useBillingPlans() {
  return useListBillingPlans({
    query: {
      staleTime: 60_000,
      select: (response) => response.data.data,
    },
  })
}
