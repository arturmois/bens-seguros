import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { ClientsContent } from '@/features/clients/components/clients-table'

export const metadata: Metadata = { title: 'Clientes' }

export default function ClientsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clientes' },
        ]}
        title="Clientes"
        description="Clientes (registros fiscais). Para criar, vá em Contatos e promova."
      />
      <ClientsContent />
    </div>
  )
}
