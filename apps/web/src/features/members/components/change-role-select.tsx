'use client'

import { Loader2 } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useChangeMemberRole } from '../hooks/use-members'
import {
  ASSIGNABLE_ROLES,
  ROLE_HIERARCHY,
  ROLE_LABELS,
} from '../lib/member-schemas'

interface ChangeRoleSelectProps {
  readonly memberId: string
  readonly currentRole: string
  readonly callerRole: string
}

function getAvailableRoles(callerRole: string): readonly string[] {
  const callerLevel = ROLE_HIERARCHY[callerRole] ?? 0
  return ASSIGNABLE_ROLES.filter(
    (role) => (ROLE_HIERARCHY[role] ?? 0) < callerLevel
  )
}

export function ChangeRoleSelect({
  memberId,
  currentRole,
  callerRole,
}: ChangeRoleSelectProps) {
  const changeMemberRole = useChangeMemberRole()
  const availableRoles = getAvailableRoles(callerRole)

  function handleRoleChange(value: string | null) {
    if (!value || value === currentRole) return
    changeMemberRole.mutate({ id: memberId, role: value })
  }

  if (availableRoles.length === 0) {
    return (
      <span className="text-sm">{ROLE_LABELS[currentRole] ?? currentRole}</span>
    )
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <Select
        value={currentRole}
        onValueChange={handleRoleChange}
        disabled={changeMemberRole.isPending}
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Selecione um cargo" />
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role] ?? role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {changeMemberRole.isPending && (
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
      )}
    </div>
  )
}
