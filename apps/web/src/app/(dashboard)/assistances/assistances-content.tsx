'use client'

import { Suspense } from 'react'

import { AssistancesTable } from '@/features/assistances/components/assistances-table'

export function AssistancesContent() {
  return (
    <Suspense>
      <AssistancesTable />
    </Suspense>
  )
}
