import { AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import {
  CLAIM_PRIORITY_BADGE_VARIANT,
  CLAIM_PRIORITY_LABELS,
} from '../lib/constants'
import type { ClaimPriority } from '../lib/types'

interface ClaimPriorityBadgeProps {
  readonly priority: ClaimPriority
  readonly className?: string
}

export function ClaimPriorityBadge({
  priority,
  className,
}: ClaimPriorityBadgeProps) {
  return (
    <Badge
      variant={CLAIM_PRIORITY_BADGE_VARIANT[priority]}
      className={className}
    >
      {priority === 'URGENT' && <AlertTriangle />}
      {CLAIM_PRIORITY_LABELS[priority]}
    </Badge>
  )
}
