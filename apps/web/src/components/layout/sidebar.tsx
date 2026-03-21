'use client';

import { OrgSwitcher } from '@/features/org/components/org-switcher';
import { UserMenu } from '@/components/layout/user-menu';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { Role } from '@repo/auth/roles';
import {
  AlertTriangle,
  ClipboardList,
  DollarSign,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  role: Role;
  collapsed: boolean;
}

const MAIN_NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { href: '/clients', label: 'Clientes', icon: Users, permission: 'clients:read' },
  { href: '/proposals', label: 'Propostas', icon: FileText, permission: 'proposals:read' },
  { href: '/policies', label: 'Apólices', icon: Shield, permission: 'policies:read' },
  { href: '/claims', label: 'Sinistros', icon: AlertTriangle, permission: 'claims:read' },
  { href: '/commissions', label: 'Comissões', icon: DollarSign, permission: 'commissions:read' },
] as const;

const SECONDARY_NAV = [
  { href: '/chat', label: 'Chat', icon: MessageSquare, permission: null },
  { href: '/audit', label: 'Auditoria', icon: ClipboardList, permission: 'audit:read' },
  { href: '/settings', label: 'Configurações', icon: Settings, permission: 'settings:read' },
] as const;

export function Sidebar({ role, collapsed }: SidebarProps) {
  const pathname = usePathname();

  const mainItems = MAIN_NAV.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
  );

  const secondaryItems = SECONDARY_NAV.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
  );

  return (
    <aside
      className={cn(
        'bg-card flex h-screen flex-col border-r transition-all',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <OrgSwitcher collapsed={collapsed} />

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
              collapsed={collapsed}
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
                />
              ))}
            </div>
          </>
        )}
      </nav>

      <UserMenu collapsed={collapsed} />
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
        collapsed && 'justify-center px-0',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
