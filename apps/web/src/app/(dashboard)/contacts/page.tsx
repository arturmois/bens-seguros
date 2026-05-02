import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { Button } from '@/components/ui/button'
import { ContactList } from '@/features/contacts/components/contact-list'

export const metadata: Metadata = { title: 'Contatos' }

export default function ContactsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Contatos' },
        ]}
        title="Contatos"
        description="Pessoas em contato comercial. Promova a cliente ao informar CPF/CNPJ."
        action={
          <Button render={<Link href="/contacts/new" />}>
            <Plus className="size-4" />
            Novo contato
          </Button>
        }
      />
      <ContactList />
    </div>
  )
}
