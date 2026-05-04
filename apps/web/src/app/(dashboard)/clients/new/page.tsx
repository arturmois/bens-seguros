import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { ClientForm } from '@/features/clients/components/client-form'

export const metadata: Metadata = { title: 'Novo cliente' }

export default function NewClientPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clientes', href: '/clients' },
          { label: 'Novo' },
        ]}
        title="Novo cliente"
        description="Cadastre um cliente fiscal (registro de PF ou PJ)."
      />
      <ClientForm />
    </div>
  )
}
