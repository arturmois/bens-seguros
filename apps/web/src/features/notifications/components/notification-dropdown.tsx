'use client'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CheckCheck } from 'lucide-react'
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '../hooks/use-notifications'
import { NotificationItem } from './notification-item'

export function NotificationDropdown() {
  const { data, isLoading } = useNotifications(15)
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const notifications = data?.data ?? []
  const hasUnread = notifications.some((n) => !n.read)

  return (
    <div className="w-80">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-semibold">Notificações</span>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="size-3.5" />
            Marcar todas
          </Button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-5" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Nenhuma notificação
          </div>
        )}

        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={(id) => markAsRead.mutate(id)}
          />
        ))}
      </div>
    </div>
  )
}
