'use client'

import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { ClaimPriority, ClaimStatus } from '../lib/types'
import { ClaimPriorityBadge } from './claim-priority-badge'
import { ClaimStatusBadge } from './claim-status-badge'

interface ClaimDetailHeaderProps {
  readonly formattedNumber: string
  readonly status: ClaimStatus
  readonly priority: ClaimPriority
  readonly onDelete: () => void
}

export function ClaimDetailHeader({
  formattedNumber,
  status,
  priority,
  onDelete,
}: ClaimDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-xl">{formattedNumber}</h2>
        <ClaimStatusBadge status={status} />
        <ClaimPriorityBadge priority={priority} />
      </div>
      <Button variant="destructive" onClick={onDelete}>
        <Trash2 className="mr-2 h-4 w-4" />
        Excluir
      </Button>
    </div>
  )
}
