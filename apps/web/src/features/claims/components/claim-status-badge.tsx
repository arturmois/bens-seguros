import { Badge } from '@/components/ui/badge'

import {
  CLAIM_STATUS_BADGE_VARIANT,
  CLAIM_STATUS_LABELS,
} from '../lib/constants'
import type { ClaimStatus } from '../lib/types'

interface ClaimStatusBadgeProps {
  readonly status: ClaimStatus
  readonly className?: string
}

export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  return (
    <Badge variant={CLAIM_STATUS_BADGE_VARIANT[status]} className={className}>
      {CLAIM_STATUS_LABELS[status]}
    </Badge>
  )
}
