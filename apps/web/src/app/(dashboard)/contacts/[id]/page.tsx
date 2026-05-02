'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

import { Button } from '@/components/ui/button'
import { ContactDetail } from '@/features/contacts/components/contact-detail'
import { useContact } from '@/features/contacts/hooks/use-contacts'

interface ContactDetailPageProps {
  readonly params: Promise<{ id: string }>
}

export default function ContactDetailPage({ params }: ContactDetailPageProps) {
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

  return <ContactDetail contact={contact} />
}
