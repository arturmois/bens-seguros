'use client'

import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/features/notifications/components/notification-bell'
import { PanelLeftClose, PanelLeft } from 'lucide-react'

interface HeaderProps {
  collapsed: boolean
  onToggleSidebar: () => void
}

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label={collapsed ? 'Abrir menu lateral' : 'Fechar menu lateral'}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <PanelLeft className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </Button>

      <div className="flex items-center gap-2">
        <NotificationBell />
      </div>
    </header>
  )
}
