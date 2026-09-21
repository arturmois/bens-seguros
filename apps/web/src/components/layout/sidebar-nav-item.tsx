'use client'

import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

interface SidebarNavItemProps {
  readonly href: string
  readonly label: string
  readonly icon: LucideIcon
  readonly isActive: boolean
  readonly collapsed: boolean
  readonly badgeCount?: number
  readonly onClick?: () => void
}

export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  badgeCount = 0,
  onClick,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted',
        collapsed && 'justify-center px-0'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
      {badgeCount > 0 && !collapsed && (
        <span className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive font-medium text-destructive-foreground text-xs">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
      {badgeCount > 0 && collapsed && (
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive" />
      )}
    </Link>
  )
}
