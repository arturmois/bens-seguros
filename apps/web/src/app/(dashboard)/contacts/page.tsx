import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
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
      />
      <ContactList />
    </div>
  )
}
