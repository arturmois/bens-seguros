'use client'

import { useListBillingInvoices } from '@/api/endpoints/billing/billing'

interface UseBillingInvoicesArgs {
  readonly cursor?: string
  readonly limit?: number
}

export function useBillingInvoices({
  cursor,
  limit = 10,
}: UseBillingInvoicesArgs = {}) {
  return useListBillingInvoices(
    { cursor, limit },
    {
      query: {
        staleTime: 30_000,
        select: (response) => ({
          items: response.data.data,
          nextCursor: response.data.meta.nextCursor ?? null,
        }),
      },
    }
  )
}
