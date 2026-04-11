import type { Metadata } from 'next'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { InsurersTable } from '@/features/insurers/components/insurers-table'

export const metadata: Metadata = { title: 'Seguradoras' }

export default function DashboardInsurersPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Seguradoras' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seguradoras</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as seguradoras disponíveis para propostas, apólices e
            sinistros.
          </p>
        </div>
      </div>
      <InsurersTable />
    </div>
  )
}
