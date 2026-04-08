'use client'

import { useRouter } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ClientForm } from '@/features/clients/components/client-form'

export default function NewClientPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clientes', href: '/clients' },
            { label: 'Novo Cliente' },
          ]}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Novo Cliente
          </h1>
          <p className="text-muted-foreground text-sm">
            Cadastre um novo cliente ou lead.
          </p>
        </div>
      </div>

      <div className="max-w-3xl rounded-lg border p-6">
        <h2 className="font-semibold">Dados do Cliente</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Preencha as informações abaixo para cadastrar.
        </p>

        <ClientForm
          onSuccess={() => router.push('/clients')}
          onCancel={() => router.push('/clients')}
        />
      </div>
    </div>
  )
}
