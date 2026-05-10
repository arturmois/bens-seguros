import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { ChannelStatus } from '../types'

interface ChannelStatusBadgeProps {
  readonly status: ChannelStatus
}

const STATUS_CONFIG: Record<
  ChannelStatus,
  {
    label: string
    variant: 'success' | 'outline' | 'warning'
    icon: typeof CheckCircle2
    pulse: boolean
  }
> = {
  CONNECTED: {
    label: 'Conectado',
    variant: 'success',
    icon: CheckCircle2,
    pulse: false,
  },
  DISCONNECTED: {
    label: 'Desconectado',
    variant: 'outline',
    icon: Circle,
    pulse: false,
  },
  QR_PENDING: {
    label: 'Aguardando QR',
    variant: 'warning',
    icon: Loader2,
    pulse: true,
  },
  TOKEN_EXPIRED: {
    label: 'Token expirado',
    variant: 'warning',
    icon: AlertTriangle,
    pulse: false,
  },
  NEEDS_REAUTH: {
    label: 'Reautenticação necessária',
    variant: 'warning',
    icon: RefreshCw,
    pulse: false,
  },
}

export function ChannelStatusBadge({ status }: ChannelStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <Badge variant={config.variant}>
      <Icon
        aria-hidden="true"
        className={cn('size-3', config.pulse && 'animate-spin')}
      />
      {config.label}
    </Badge>
  )
}
