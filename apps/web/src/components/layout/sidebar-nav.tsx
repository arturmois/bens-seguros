'use client'

import { ALERT_BADGE_MAP, type NavConfigItem } from './sidebar-nav-config'
import { SidebarNavItem } from './sidebar-nav-item'

interface SidebarNavProps {
  readonly mainItems: ReadonlyArray<NavConfigItem>
  readonly secondaryItems: ReadonlyArray<NavConfigItem>
  readonly pathname: string
  readonly collapsed: boolean
  readonly alertCounts?: Record<string, number>
  readonly onNavigate?: () => void
}

export function SidebarNav({
  mainItems,
  secondaryItems,
  pathname,
  collapsed,
  alertCounts,
  onNavigate,
}: SidebarNavProps) {
  return (
    <nav aria-label="Menu principal" className="flex-1 overflow-y-auto p-2">
      <div className="space-y-1">
        {mainItems.map((item) => {
          const entityType = ALERT_BADGE_MAP[item.href]
          const badgeCount = entityType ? (alertCounts?.[entityType] ?? 0) : 0
          return (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
              collapsed={collapsed}
              badgeCount={badgeCount}
              onClick={onNavigate}
            />
          )
        })}
      </div>
      {secondaryItems.length > 0 && (
        <>
          <div className="my-2" />
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
                collapsed={collapsed}
                onClick={onNavigate}
              />
            ))}
          </div>
        </>
      )}
    </nav>
  )
}
