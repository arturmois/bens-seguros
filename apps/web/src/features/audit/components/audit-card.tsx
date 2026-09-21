'use client'

import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters'

import {
  ACTION_LABELS,
  ACTION_VARIANT,
  ENTITY_TYPE_LABELS,
} from '../lib/constants'
import type { AuditLogData } from '../lib/types'

interface AuditCardProps {
  readonly entry: AuditLogData
  readonly onView: (entry: AuditLogData) => void
}

export function AuditCard({ entry, onView }: AuditCardProps) {
  return (
    <div
      className="cursor-pointer space-y-3 rounded-lg border bg-card p-4 active:bg-muted/50"
      onClick={() => onView(entry)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView(entry)
        }
      }}
    >
      <div className="flex items-center justify-between">
        <Badge variant={ACTION_VARIANT[entry.action] ?? 'default'} size="sm">
          {ACTION_LABELS[entry.action] ?? entry.action}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {formatDate(entry.createdAt)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Entidade</div>
          <div>{ENTITY_TYPE_LABELS[entry.entityType] ?? entry.entityType}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">ID</div>
          <div className="truncate font-mono text-xs">
            {entry.entityId ?? '-'}
          </div>
        </div>
      </div>
    </div>
  )
}
