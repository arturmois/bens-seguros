'use client'

import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/formatters'

import { ROLE_LABELS } from '../lib/member-schemas'
import type { MemberData } from '../types'
import { ChangeRoleSelect } from './change-role-select'

interface MemberCardProps {
  readonly member: MemberData
  readonly canAct: boolean
  readonly currentUserRole: string
  readonly onRemove: (member: MemberData) => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

export function MemberCard({
  member,
  canAct,
  currentUserRole,
  onRemove,
}: MemberCardProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm"
            aria-hidden="true"
          >
            {getInitials(member.name ?? member.email)}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">
              {member.name ?? <span className="text-muted-foreground">—</span>}
            </div>
            <div className="truncate text-muted-foreground text-xs">
              {member.email}
            </div>
          </div>
        </div>
        {canAct && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRemove(member)}
            aria-label={`Remover ${member.name ?? member.email}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Cargo</div>
          {canAct ? (
            <ChangeRoleSelect
              memberId={member.id}
              currentRole={member.role}
              callerRole={currentUserRole}
            />
          ) : (
            <span>{ROLE_LABELS[member.role] ?? member.role}</span>
          )}
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Desde</div>
          <div>{formatDate(member.createdAt)}</div>
        </div>
      </div>
    </div>
  )
}
