'use client'

import { ExternalLink, GitBranch } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

import type { ProposalData } from '../../../lib/constants'

interface EndorsementCardProps {
  readonly proposal: ProposalData
}

export function EndorsementCard({ proposal }: EndorsementCardProps) {
  if (proposal.boardType !== 'ENDORSEMENT' || !proposal.sourcePolicySnapshot) {
    return null
  }
  const { policyNumber, clientName, insurerName } =
    proposal.sourcePolicySnapshot
  return (
    <div className="flex items-center gap-4 rounded-xl border-purple-500 border-l-4 bg-purple-50 p-4 dark:bg-purple-950/30">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-500/90 text-white">
        <GitBranch className="size-5" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-purple-800 text-xs uppercase tracking-wider dark:text-purple-200">
          Apólice de Origem · {policyNumber}
        </p>
        <p className="mt-1 text-purple-900 text-sm dark:text-purple-100">
          {clientName} · {insurerName ?? 'Seguradora não informada'}
          {proposal.endorsementType && (
            <>
              {' · '}
              <strong>{proposal.endorsementType}</strong>
            </>
          )}
        </p>
        {proposal.endorsementReason && (
          <p className="mt-1 text-purple-800/80 text-xs dark:text-purple-200/80">
            Motivo: {proposal.endorsementReason}
          </p>
        )}
      </div>
      {proposal.sourcePolicyId && (
        <Button
          variant="outline"
          size="sm"
          className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-200 dark:hover:bg-purple-900/40"
          render={<Link href={`/policies/${proposal.sourcePolicyId}`} />}
        >
          <ExternalLink className="mr-1.5 size-3.5" /> Ver
        </Button>
      )}
    </div>
  )
}
