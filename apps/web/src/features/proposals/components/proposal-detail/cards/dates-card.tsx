'use client'

import { Calendar } from 'lucide-react'

import { formatDate } from '@/lib/formatters'

import type { ProposalData } from '../../../lib/constants'

interface DatesCardProps {
  readonly proposal: ProposalData
}

function fmt(date: string | null | undefined): string {
  return date ? formatDate(date) : '—'
}

interface PairProps {
  readonly label: string
  readonly value: string
  readonly dim?: boolean
  readonly fullWidth?: boolean
}

function Pair({ label, value, dim, fullWidth }: PairProps) {
  return (
    <div className={fullWidth ? 'col-span-2' : undefined}>
      <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={`font-medium ${dim ? 'text-muted-foreground italic' : ''}`}
      >
        {value}
      </dd>
    </div>
  )
}

export function DatesCard({ proposal }: DatesCardProps) {
  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-muted-foreground inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          <Calendar className="text-primary size-3.5" /> Datas
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Pair label="Vigência Início" value={fmt(proposal.coverageStartDate)} />
        <Pair label="Vigência Fim" value={fmt(proposal.coverageEndDate)} />
        <Pair label="Validade Cotação" value={fmt(proposal.quoteValidUntil)} />
        <Pair label="Enviada em" value={fmt(proposal.sentToClientAt)} />
        <Pair
          label="Resposta do Cliente"
          value={fmt(proposal.clientResponseAt)}
          dim={!proposal.clientResponseAt}
          fullWidth
        />
      </dl>
    </div>
  )
}
