'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

import { FormPageShell } from '@/components/shared/form-page-shell'
import { Button } from '@/components/ui/button'
import { ClientForm } from '@/features/clients/components/client-form'
import { useClient } from '@/features/clients/hooks/use-clients'

interface EditClientPageProps {
  readonly params: Promise<{ id: string }>
}

export default function EditClientPage({ params }: EditClientPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: client, isLoading, isError } = useClient(id)
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (isError || !client) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p role="alert" className="text-destructive text-sm">
          Cliente não encontrado.
        </p>
        <Button variant="link" onClick={() => router.push('/clients')}>
          Voltar para clientes
        </Button>
      </div>
    )
  }
  return (
    <FormPageShell
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Clientes', href: '/clients' },
        { label: client.legalName, href: `/clients/${id}` },
        { label: 'Editar' },
      ]}
      title="Editar cliente"
      description="Atualize as informações do cliente."
      cardTitle="Dados do cliente"
      cardDescription="Altere os campos necessários e salve."
    >
      <ClientForm
        mode="edit"
        initial={client}
        onSuccess={() => router.push(`/clients/${id}`)}
        onCancel={() => router.push(`/clients/${id}`)}
      />
    </FormPageShell>
  )
}
