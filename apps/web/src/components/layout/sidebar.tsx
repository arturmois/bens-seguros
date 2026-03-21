'use client';

import { OrgSwitcher } from '@/features/org/components/org-switcher';
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

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { href: '/clients', label: 'Clientes', icon: Users, permission: 'clients:read' },
  { href: '/proposals', label: 'Propostas', icon: FileText, permission: 'proposals:read' },
  { href: '/policies', label: 'Apólices', icon: Shield, permission: 'policies:read' },
  { href: '/claims', label: 'Sinistros', icon: AlertTriangle, permission: 'claims:read' },
  {
    href: '/commissions',
    label: 'Comissões',
    icon: DollarSign,
    permission: 'commissions:read',
  },
  { href: '/chat', label: 'Chat', icon: MessageSquare, permission: null },
  { href: '/audit', label: 'Auditoria', icon: ClipboardList, permission: 'audit:read' },
  { href: '/settings', label: 'Configurações', icon: Settings, permission: 'settings:read' },
] as const;

export function Sidebar({ role, collapsed }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
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

      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
