import { Badge } from '@/components/ui/badge'

import {
  COMMISSION_STATUS_BADGE_VARIANT,
  COMMISSION_STATUS_LABELS,
} from '../lib/constants'
import type { CommissionStatus } from '../lib/types'

interface CommissionStatusBadgeProps {
  readonly status: CommissionStatus
  readonly className?: string
}

export function CommissionStatusBadge({
  status,
  className,
}: CommissionStatusBadgeProps) {
  return (
    <Badge
      variant={COMMISSION_STATUS_BADGE_VARIANT[status]}
      className={className}
    >
      {COMMISSION_STATUS_LABELS[status]}
    </Badge>
  )
}
