'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { type Role, ROLES } from '@repo/auth/roles'
import { AppShell } from '@/components/layout/app-shell'
import { Spinner } from '@/components/ui/spinner'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { TermsAcceptanceModal } from '@/features/legal/components/terms-acceptance-modal'
import { clearActiveOrgCookie } from '@/lib/org-cookie'

const DEFAULT_ROLE: Role = 'VIEWER'

function isRole(value: string): value is Role {
  return Object.values(ROLES).some((role) => role === value)
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { activeOrg, isLoading } = useOrgs()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !activeOrg) {
      clearActiveOrgCookie()
      router.replace('/select-org')
    }
  }, [isLoading, activeOrg, router])

  if (isLoading || !activeOrg) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    )
  }

  const rawRole = activeOrg.role
  const role: Role = isRole(rawRole) ? rawRole : DEFAULT_ROLE

  return (
    <>
      <AppShell role={role}>{children}</AppShell>
      <TermsAcceptanceModal />
    </>
  )
}
