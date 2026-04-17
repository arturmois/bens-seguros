'use client'

import { Suspense } from 'react'

import { ClaimsTable } from '@/features/claims/components/claims-table'

export function ClaimsContent() {
  return (
    <Suspense>
      <ClaimsTable />
    </Suspense>
  )
}
