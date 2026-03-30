import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { ClaimPriority } from '../lib/constants'
import { CLAIM_PRIORITY_COLORS, CLAIM_PRIORITY_LABELS } from '../lib/constants'

interface ClaimPriorityBadgeProps {
  readonly priority: ClaimPriority
  readonly className?: string
}

export function ClaimPriorityBadge({
  priority,
  className,
}: ClaimPriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        CLAIM_PRIORITY_COLORS[priority],
        priority === 'URGENT' && 'ring-1 ring-red-300 dark:ring-red-700',
        className
      )}
    >
      {priority === 'URGENT' && <AlertTriangle className="h-3 w-3" />}
      {CLAIM_PRIORITY_LABELS[priority]}
    </span>
  )
}
