'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

import { FormPageShell } from '@/components/shared/form-page-shell'
import { Button } from '@/components/ui/button'
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
    <FormPageShell
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Contatos', href: '/contacts' },
        { label: contact.name, href: `/contacts/${id}` },
        { label: 'Editar' },
      ]}
      title="Editar contato"
      description="Atualize as informações do contato."
      cardTitle="Dados do contato"
      cardDescription="Altere os campos necessários e salve."
    >
      <ContactForm
        mode="edit"
        initial={contact}
        onSuccess={() => router.push(`/contacts/${id}`)}
        onCancel={() => router.push(`/contacts/${id}`)}
      />
    </FormPageShell>
  )
}
