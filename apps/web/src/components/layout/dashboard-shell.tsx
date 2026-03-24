'use client'

import { type Role, ROLES } from '@repo/auth/roles'
import { AppShell } from '@/components/layout/app-shell'
import { useOrgs } from '@/features/org/hooks/use-orgs'

const DEFAULT_ROLE: Role = 'VIEWER'

function isRole(value: string): value is Role {
  return Object.values(ROLES).some((role) => role === value)
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { activeOrg, isLoading } = useOrgs()

  if (isLoading || !activeOrg) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    )
  }

  const rawRole = activeOrg.role
  const role: Role = isRole(rawRole) ? rawRole : DEFAULT_ROLE

  return <AppShell role={role}>{children}</AppShell>
}
