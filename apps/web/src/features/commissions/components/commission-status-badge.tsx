import { cn } from '@/lib/utils'

import type { CommissionStatus } from '../lib/constants'
import {
  COMMISSION_STATUS_COLORS,
  COMMISSION_STATUS_LABELS,
} from '../lib/constants'

interface CommissionStatusBadgeProps {
  readonly status: CommissionStatus
  readonly className?: string
}

export function CommissionStatusBadge({
  status,
  className,
}: CommissionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        COMMISSION_STATUS_COLORS[status],
        className
      )}
    >
      {COMMISSION_STATUS_LABELS[status]}
    </span>
  )
}
