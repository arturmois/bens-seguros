'use client'

import { UserMenu } from '@/components/layout/user-menu'
import { OrgSwitcher } from '@/features/org/components/org-switcher'
import { hasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import type { Role } from '@repo/auth/roles'
import {
  AlertTriangle,
  ClipboardList,
  DollarSign,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  role: Role
  collapsed: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const MAIN_NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: null,
  },
  {
    href: '/clients',
    label: 'Clientes',
    icon: Users,
    permission: 'clients:read',
  },
  {
    href: '/proposals',
    label: 'Propostas',
    icon: FileText,
    permission: 'proposals:read',
  },
  {
    href: '/policies',
    label: 'Apólices',
    icon: Shield,
    permission: 'policies:read',
  },
  {
    href: '/claims',
    label: 'Sinistros',
    icon: AlertTriangle,
    permission: 'claims:read',
  },
  {
    href: '/assistances',
    label: 'Assistências',
    icon: LifeBuoy,
    permission: 'assistances:read',
  },
  {
    href: '/commissions',
    label: 'Comissões',
    icon: DollarSign,
    permission: 'commissions:read',
  },
] as const

const SECONDARY_NAV = [
  { href: '/chat', label: 'Chat', icon: MessageSquare, permission: null },
  {
    href: '/audit',
    label: 'Auditoria',
    icon: ClipboardList,
    permission: 'audit:read',
  },
  {
    href: '/settings',
    label: 'Configurações',
    icon: Settings,
    permission: 'settings:read',
  },
] as const

export function Sidebar({
  role,
  collapsed,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname()

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
            'bg-card w-68 fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <OrgSwitcher collapsed={false} />
            <button
              onClick={onMobileClose}
              className="text-muted-foreground hover:text-foreground rounded-md p-1.5"
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
        'bg-card flex h-screen flex-col border-r transition-all',
        collapsed ? 'w-16' : 'w-68'
      )}
    >
      <OrgSwitcher collapsed={collapsed} />

      <SidebarNav
        mainItems={mainItems}
        secondaryItems={secondaryItems}
        pathname={pathname}
        collapsed={collapsed}
      />

      <UserMenu collapsed={collapsed} />
    </aside>
  )
}

function SidebarNav({
  mainItems,
  secondaryItems,
  pathname,
  collapsed,
  onNavigate,
}: {
  mainItems: ReadonlyArray<{
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }>
  secondaryItems: ReadonlyArray<{
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }>
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Menu principal" className="flex-1 overflow-y-auto p-2">
      <div className="space-y-1">
        {mainItems.map((item) => (
          <NavItem
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

      {secondaryItems.length > 0 && (
        <>
          <div className="my-2" />
          <div className="space-y-1">
            {secondaryItems.map((item) => (
              <NavItem
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

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  onClick,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted',
        collapsed && 'justify-center px-0'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}
