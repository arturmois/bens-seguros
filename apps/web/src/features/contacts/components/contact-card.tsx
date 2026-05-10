'use client'

import { useRouter } from 'next/navigation'

import { getInitials } from '@/lib/formatters'

import { CONTACT_SOURCE_LABELS } from '../lib/constants'
import type { ContactListItem } from '../lib/types'
import { ContactStageBadge } from './contact-stage-badge'

interface ContactCardProps {
  readonly contact: ContactListItem
}

export function ContactCard({ contact }: ContactCardProps) {
  const router = useRouter()
  function navigate() {
    router.push(`/contacts/${contact.id}`)
  }
  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={navigate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate()
        }
      }}
    >
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {getInitials(contact.name)}
        </div>
        <span className="font-medium">{contact.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Contato</div>
          <div>{contact.phone ?? contact.email ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Origem</div>
          <div>{CONTACT_SOURCE_LABELS[contact.source]}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Estágio</div>
          <ContactStageBadge stage={contact.stage} />
        </div>
      </div>
    </div>
  )
}
