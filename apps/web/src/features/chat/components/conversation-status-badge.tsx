'use client'

import { Badge } from '@/components/ui/badge'
import type { ConversationStatus } from '../types'

interface ConversationStatusBadgeProps {
  readonly status: ConversationStatus
}

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; variant: 'default' | 'warning' | 'success' | 'secondary' }
> = {
  BOT_ACTIVE: { label: 'Bot', variant: 'default' },
  WAITING_HUMAN: { label: 'Fila', variant: 'warning' },
  HUMAN_ACTIVE: { label: 'Atendendo', variant: 'success' },
  CLOSED: { label: 'Fechada', variant: 'secondary' },
}

export function ConversationStatusBadge({
  status,
}: ConversationStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  )
}
