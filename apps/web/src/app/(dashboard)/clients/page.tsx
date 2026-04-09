import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { Button } from '@/components/ui/button'
import { ClientsContent } from '@/features/clients/components/clients-table'

export const metadata: Metadata = { title: 'Clientes' }

export default function ClientsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clientes' },
          ]}
        />

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie sua base de clientes e leads.
            </p>
          </div>
          <Button render={<Link href="/clients/new" />}>
            <Plus className="size-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <ClientsContent />
    </div>
  )
}
