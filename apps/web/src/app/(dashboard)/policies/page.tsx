import { Suspense } from 'react'
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { PoliciesTable } from '@/features/policies/components/policies-table'

export const metadata: Metadata = { title: 'Apólices' }

export default function PoliciesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Apólices' },
        ]}
        title="Apólices"
        description="Apólices de seguro emitidas."
      />
      <Suspense>
        <PoliciesTable />
      </Suspense>
    </div>
  )
}
