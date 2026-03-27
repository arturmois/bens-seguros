'use client'

import { Popover, PopoverTrigger, PopoverPopup } from '@/components/ui/popover'
import { Bell } from 'lucide-react'
import { useUnreadCount } from '../hooks/use-notifications'
import { NotificationDropdown } from './notification-dropdown'

export function NotificationBell() {
  const { data: unreadCount } = useUnreadCount()

  return (
    <Popover>
      <PopoverTrigger
        className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ''}`}
      >
        <Bell className="size-4" />
        {unreadCount !== undefined && unreadCount > 0 && (
          <span className="bg-destructive text-destructive-foreground absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverPopup side="bottom" align="end" sideOffset={8}>
        <NotificationDropdown />
      </PopoverPopup>
    </Popover>
  )
}
