'use client'

import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { hasPermission } from '@/lib/permissions'

interface NewClientButtonProps {
  readonly onClick: () => void
}

export function NewClientButton({ onClick }: NewClientButtonProps) {
  const { activeOrg } = useOrgs()
  if (!activeOrg) return null
  if (!hasPermission(activeOrg.role, 'clients:create')) return null
  return (
    <Button onClick={onClick}>
      <Plus className="size-4 sm:mr-2" />
      <span className="hidden sm:inline">Novo cliente</span>
    </Button>
  )
}
