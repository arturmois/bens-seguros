'use client'

import { ExternalLink, User } from 'lucide-react'
import Link from 'next/link'

import { useContact } from '@/features/contacts/hooks/use-contacts'
import { getInitials } from '@/lib/formatters'

import type { ProposalData } from '../../../lib/constants'

interface ContactCardProps {
  readonly proposal: ProposalData
}

export function ContactCard({ proposal }: ContactCardProps) {
  const { data: contact } = useContact(proposal.contactId)
  const name = proposal.clientName ?? contact?.name ?? '—'
  const documentLabel = proposal.clientPersonType === 'LEGAL' ? 'CNPJ' : 'CPF'
  const documentValue = proposal.clientDocument
  const email = contact?.email ?? '—'
  const phone = contact?.phone ?? '—'
  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          <User className="text-primary size-3.5" /> Contato
        </p>
        {proposal.contactId && (
          <Link
            href={`/contacts/${proposal.contactId}`}
            aria-label="Abrir contato"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="size-4" />
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-full text-sm font-bold">
          {getInitials(name)}
        </div>
        <div>
          <p className="text-sm font-semibold">{name}</p>
          {documentValue && (
            <p className="text-muted-foreground text-xs">
              {documentLabel} {documentValue}
            </p>
          )}
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Email
          </dt>
          <dd className="font-medium">{email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Telefone
          </dt>
          <dd className="font-medium">{phone}</dd>
        </div>
      </dl>
    </div>
  )
}
