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
import { ContactForm } from '@/features/contacts/components/contact-form'
import { useContact } from '@/features/contacts/hooks/use-contacts'

interface EditContactPageProps {
  readonly params: Promise<{ id: string }>
}

export default function EditContactPage({ params }: EditContactPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: contact, isLoading, isError } = useContact(id)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }

  if (isError || !contact) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p role="alert" className="text-destructive text-sm">
          Contato não encontrado.
        </p>
        <Button variant="link" onClick={() => router.push('/contacts')}>
          Voltar para contatos
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
            { label: 'Contatos', href: '/contacts' },
            { label: contact.name, href: `/contacts/${id}` },
            { label: 'Editar' },
          ]}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar contato
          </h1>
          <p className="text-muted-foreground text-sm">
            Atualize as informações do contato.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Dados do contato</CardTitle>
          <CardDescription>
            Altere os campos necessários e salve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm
            mode="edit"
            initial={contact}
            onSuccess={() => router.push(`/contacts/${id}`)}
            onCancel={() => router.push(`/contacts/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
