import { cn } from '@/lib/utils'

import type { ClaimStatus } from '../lib/constants'
import { CLAIM_STATUS_COLORS, CLAIM_STATUS_LABELS } from '../lib/constants'

interface ClaimStatusBadgeProps {
  readonly status: ClaimStatus
  readonly className?: string
}

export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        CLAIM_STATUS_COLORS[status],
        className
      )}
    >
      {CLAIM_STATUS_LABELS[status]}
    </span>
  )
}
