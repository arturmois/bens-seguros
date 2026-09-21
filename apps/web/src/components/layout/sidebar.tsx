'use client'

import type { Role } from '@repo/auth/roles'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { UserMenu } from '@/components/layout/user-menu'
import { useAlertCounts } from '@/features/notifications/hooks/use-alert-counts'
import { OrgSwitcher } from '@/features/org/components/org-switcher'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

import { SidebarNav } from './sidebar-nav'
import { MAIN_NAV, SECONDARY_NAV } from './sidebar-nav-config'

interface SidebarProps {
  role: Role
  collapsed: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({
  role,
  collapsed,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()
  const { data: alertCounts } = useAlertCounts()
  const mainItems = MAIN_NAV.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  )
  const secondaryItems = SECONDARY_NAV.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  )
  const isMobileMode = mobileOpen !== undefined
  if (isMobileMode) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r bg-card transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <OrgSwitcher collapsed={false} />
            <button
              onClick={onMobileClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
          </div>
          <SidebarNav
            mainItems={mainItems}
            secondaryItems={secondaryItems}
            pathname={pathname}
            collapsed={false}
            alertCounts={alertCounts}
            onNavigate={onMobileClose}
          />
          <UserMenu collapsed={false} />
        </aside>
      </>
    )
  }
  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-all',
        collapsed ? 'w-16' : 'w-68'
      )}
    >
      <OrgSwitcher collapsed={collapsed} />
      <SidebarNav
        mainItems={mainItems}
        secondaryItems={secondaryItems}
        pathname={pathname}
        collapsed={collapsed}
        alertCounts={alertCounts}
      />
      <UserMenu collapsed={collapsed} />
    </aside>
  )
}
