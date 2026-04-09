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
import { toInputDateString } from '@/lib/date-utils'

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
        <p className="text-destructive text-sm">
          Erro ao carregar os dados do cliente.
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
            { label: client.name, href: `/clients/${id}` },
            { label: 'Editar' },
          ]}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar Cliente
          </h1>
          <p className="text-muted-foreground text-sm">
            Atualize as informações do cliente.
          </p>
        </div>
      </div>

      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>
            Altere os campos necessários e salve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            clientId={id}
            defaultValues={{
              name: client.name,
              document: client.document,
              personType: client.personType ?? 'INDIVIDUAL',
              type: client.type,
              email: client.email ?? '',
              phone: client.phone ?? '',
              birthDate: client.birthDate
                ? toInputDateString(client.birthDate)
                : '',
              profession: client.profession ?? '',
              maritalStatus: client.maritalStatus ?? undefined,
              socialMedia: client.socialMedia
                ? {
                    instagram: client.socialMedia.instagram ?? '',
                    facebook: client.socialMedia.facebook ?? '',
                    linkedin: client.socialMedia.linkedin ?? '',
                    tiktok: client.socialMedia.tiktok ?? '',
                  }
                : undefined,
            }}
            onSuccess={() => router.push(`/clients/${id}`)}
            onCancel={() => router.push(`/clients/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
