import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { AuditTable } from '@/features/audit/components/audit-table'

export const metadata: Metadata = { title: 'Auditoria' }

export default function AuditPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Auditoria' },
        ]}
        title="Auditoria"
        description="Registro de atividades e alterações da organização."
      />
      <AuditTable />
    </div>
  )
}
