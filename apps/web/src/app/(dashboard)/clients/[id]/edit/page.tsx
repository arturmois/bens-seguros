'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
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
    <div className="space-y-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clientes', href: '/clients' },
            { label: client.legalName, href: `/clients/${id}` },
            { label: 'Editar' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar cliente
          </h1>
          <p className="text-muted-foreground text-sm">
            Atualize as informações do cliente.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
          <CardDescription>
            Altere os campos necessários e salve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            mode="edit"
            initial={client}
            onSuccess={() => router.push(`/clients/${id}`)}
            onCancel={() => router.push(`/clients/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
