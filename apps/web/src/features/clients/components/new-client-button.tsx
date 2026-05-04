'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { hasPermission } from '@/lib/permissions'

export function NewClientButton() {
  const { activeOrg } = useOrgs()

  if (!activeOrg) return null
  if (!hasPermission(activeOrg.role, 'clients:create')) return null

  return (
    <Button size="sm" render={<Link href="/clients/new" />}>
      <Plus className="size-4 sm:mr-2" />
      <span className="hidden sm:inline">Novo cliente</span>
    </Button>
  )
}
