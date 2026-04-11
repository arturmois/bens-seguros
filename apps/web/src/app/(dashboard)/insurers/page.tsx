import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { InsurerCreateButton } from '@/features/insurers/components/insurer-create-button'
import { InsurersTable } from '@/features/insurers/components/insurers-table'

export const metadata: Metadata = { title: 'Seguradoras' }

export default function InsurersPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Seguradoras' },
        ]}
        title="Seguradoras"
        description="Gerencie as seguradoras disponíveis para propostas, apólices e sinistros."
        action={<InsurerCreateButton />}
      />
      <InsurersTable />
    </div>
  )
}
