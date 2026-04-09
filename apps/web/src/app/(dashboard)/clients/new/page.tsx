'use client'

import { useRouter } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>
            Preencha as informações abaixo para cadastrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            onSuccess={() => router.push('/clients')}
            onCancel={() => router.push('/clients')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
