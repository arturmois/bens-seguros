'use client'

import { useRouter } from 'next/navigation'

import { formatDate } from '@/lib/formatters'

import { getAssistanceTypeLabel } from '../lib/constants'
import type { AssistanceData } from '../lib/types'
import { AssistanceStatusBadge } from './assistance-status-badge'

interface AssistanceCardProps {
  readonly assistance: AssistanceData
}

export function AssistanceCard({ assistance }: AssistanceCardProps) {
  const router = useRouter()

  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => router.push(`/assistances/${assistance.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/assistances/${assistance.id}`)
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {getAssistanceTypeLabel(assistance.type)}
        </span>
        <AssistanceStatusBadge status={assistance.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Cliente</div>
          <div className="truncate">{assistance.clientName ?? '-'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Apólice</div>
          <div>{assistance.policyNumber ?? '-'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Endereço</div>
          <div className="truncate">{assistance.address ?? '-'}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Solicitação</div>
          <div>{formatDate(assistance.requestedAt)}</div>
        </div>
      </div>
    </div>
  )
}
