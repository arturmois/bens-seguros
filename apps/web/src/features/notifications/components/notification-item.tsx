'use client'

import type { ListNotifications200DataItem } from '@/api/model'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  DollarSign,
  FileWarning,
  PauseCircle,
  UserCheck,
  XCircle,
} from 'lucide-react'

type NotificationData = ListNotifications200DataItem

const ICON_MAP: Record<string, React.ElementType> = {
  CLAIM_OPENED: FileWarning,
  COMMISSION_APPROVED: CheckCircle,
  COMMISSION_REJECTED: XCircle,
  POLICY_EXPIRING: Clock,
  INVITATION_ACCEPTED: UserCheck,
  CLAIM_STALLED: AlertTriangle,
  COMMISSION_PENDING: DollarSign,
  PROPOSAL_STAGNANT: PauseCircle,
}

const COLOR_MAP: Record<string, string> = {
  CLAIM_OPENED: 'text-warning',
  COMMISSION_APPROVED: 'text-success',
  COMMISSION_REJECTED: 'text-destructive',
  POLICY_EXPIRING: 'text-warning',
  INVITATION_ACCEPTED: 'text-info',
  CLAIM_STALLED: 'text-warning',
  COMMISSION_PENDING: 'text-warning',
  PROPOSAL_STAGNANT: 'text-muted-foreground',
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

interface NotificationItemProps {
  notification: NotificationData
  onMarkAsRead: (id: string) => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const Icon = ICON_MAP[notification.type] ?? Bell
  const iconColor = COLOR_MAP[notification.type] ?? 'text-muted-foreground'
  return (
    <button
      type="button"
      className={cn(
        'hover:bg-muted/50 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
        !notification.read && 'bg-primary/5'
      )}
      onClick={() => {
        if (!notification.read) {
          onMarkAsRead(notification.id)
        }
      }}
      aria-label={`${notification.read ? '' : 'Nova '}notificação: ${notification.title}`}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconColor)} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            notification.read
              ? 'text-muted-foreground'
              : 'text-foreground font-medium'
          )}
        >
          {notification.title}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {notification.body}
        </p>
      </div>
      <span className="text-muted-foreground shrink-0 text-xs">
        {formatRelativeTime(notification.createdAt)}
      </span>
      {!notification.read && (
        <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
      )}
    </button>
  )
}
