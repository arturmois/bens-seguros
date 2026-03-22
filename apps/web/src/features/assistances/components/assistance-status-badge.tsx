import { cn } from '@/lib/utils'

import type { AssistanceStatus } from '../types'
import {
  ASSISTANCE_STATUS_COLORS,
  ASSISTANCE_STATUS_LABELS,
} from '../lib/constants'

interface AssistanceStatusBadgeProps {
  readonly status: AssistanceStatus
  readonly className?: string
}

export function AssistanceStatusBadge({
  status,
  className,
}: AssistanceStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        ASSISTANCE_STATUS_COLORS[status],
        className
      )}
    >
      {ASSISTANCE_STATUS_LABELS[status]}
    </span>
  )
}
