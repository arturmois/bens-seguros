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
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="inline-flex items-center gap-2 font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
          <User className="size-3.5 text-primary" /> Contato
        </p>
        {proposal.contactId && (
          <Link
            href={`/contacts/${proposal.contactId}`}
            aria-label="Abrir contato"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="size-4" />
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
          {getInitials(name)}
        </div>
        <div>
          <p className="font-semibold text-sm">{name}</p>
          {documentValue && (
            <p className="text-muted-foreground text-xs">
              {documentLabel} {documentValue}
            </p>
          )}
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
            Email
          </dt>
          <dd className="font-medium">{email}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
            Telefone
          </dt>
          <dd className="font-medium">{phone}</dd>
        </div>
      </dl>
    </div>
  )
}
