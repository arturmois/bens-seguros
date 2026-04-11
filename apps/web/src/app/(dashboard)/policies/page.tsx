import type { Metadata } from 'next'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { PoliciesTable } from '@/features/policies/components/policies-table'

export const metadata: Metadata = { title: 'Apólices' }

export default function PoliciesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Apólices' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apólices</h1>
          <p className="text-muted-foreground text-sm">
            Apólices de seguro emitidas.
          </p>
        </div>
      </div>
      <PoliciesTable />
    </div>
  )
}
