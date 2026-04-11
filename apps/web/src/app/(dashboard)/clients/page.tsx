import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { Button } from '@/components/ui/button'
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
        description="Gerencie sua base de clientes e leads."
        action={
          <Button render={<Link href="/clients/new" />}>
            <Plus className="size-4" />
            Novo Cliente
          </Button>
        }
      />
      <ClientsContent />
    </div>
  )
}
