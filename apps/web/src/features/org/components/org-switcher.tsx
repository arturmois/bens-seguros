'use client'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ROLE_LABELS } from '@/features/members/lib/member-schemas'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { getOrgColor, getOrgInitials } from '@/lib/org-avatar'
import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface OrgSwitcherProps {
  collapsed: boolean
}

export function OrgSwitcher({ collapsed }: OrgSwitcherProps) {
  const { orgs, activeOrg, switchOrg } = useOrgs()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  function handleSwitch(orgId: string) {
    setOpen(false)
    if (orgId !== activeOrg?.id) {
      switchOrg(orgId)
    }
  }
  function handleCreateNew() {
    setOpen(false)
    router.push('/onboarding?new=true')
  }
  if (!activeOrg) {
    return null
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted',
          collapsed && 'justify-center px-0'
        )}
      >
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-white text-xs"
          style={{ backgroundColor: getOrgColor(activeOrg.id) }}
        >
          {getOrgInitials(activeOrg.name)}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-sm">
                {activeOrg.name}
              </div>
              {activeOrg.role && (
                <div className="truncate text-muted-foreground text-xs">
                  {ROLE_LABELS[activeOrg.role] ?? activeOrg.role}
                </div>
              )}
            </div>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align={collapsed ? 'start' : 'center'}
        side={collapsed ? 'right' : 'bottom'}
      >
        <div className="space-y-1">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSwitch(org.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                org.id === activeOrg.id && 'bg-muted'
              )}
            >
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-md font-bold text-white text-xs"
                style={{ backgroundColor: getOrgColor(org.id) }}
              >
                {getOrgInitials(org.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-sm">{org.name}</div>
                {org.role && (
                  <div className="truncate text-muted-foreground text-xs">
                    {ROLE_LABELS[org.role] ?? org.role}
                  </div>
                )}
              </div>
              {org.id === activeOrg.id && (
                <Check className="size-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
        <div className="mt-1 border-border border-t pt-1">
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-primary text-sm transition-colors hover:bg-muted"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-primary border-dashed">
              <Plus className="size-3.5" />
            </div>
            <span className="font-medium">Criar nova organização</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
