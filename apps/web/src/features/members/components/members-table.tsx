'use client'

import { AlertTriangle, Loader2, Trash2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ROLE_LABELS } from '../lib/member-schemas'
import type { MemberData } from '../types'
import { useMembers, useRemoveMember } from '../hooks/use-members'
import { ChangeRoleSelect } from './change-role-select'

interface MembersTableProps {
  readonly canManage: boolean
  readonly currentUserId: string
  readonly currentUserRole: string
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

function canActOnMember(
  canManage: boolean,
  currentUserId: string,
  member: MemberData
): boolean {
  if (!canManage) return false
  if (member.userId === currentUserId) return false
  if (member.role === 'OWNER') return false
  return true
}

const TABLE_HEADERS = (
  <TableHeader>
    <TableRow>
      <TableHead className="w-12">
        <span className="sr-only">Avatar</span>
      </TableHead>
      <TableHead>Nome</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Cargo</TableHead>
      <TableHead className="w-12">
        <span className="sr-only">Ações</span>
      </TableHead>
    </TableRow>
  </TableHeader>
)

export function MembersTable({
  canManage,
  currentUserId,
  currentUserRole,
}: MembersTableProps) {
  const { data: members, isLoading, isError, refetch } = useMembers()
  const removeMember = useRemoveMember()

  if (isLoading) return <MembersTableSkeleton />

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle />
          </EmptyMedia>
          <EmptyTitle>Erro ao carregar membros</EmptyTitle>
          <EmptyDescription>
            Não foi possível carregar os membros. Tente novamente.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={() => void refetch()}>
          Tentar novamente
        </Button>
      </Empty>
    )
  }

  if (!members || members.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>Convide sua equipe!</EmptyTitle>
          <EmptyDescription>
            Adicione membros para colaborar na gestao da sua corretora.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  function handleRemove(member: MemberData) {
    const confirmed = window.confirm(
      `Deseja remover ${member.name} da organização?`
    )
    if (!confirmed) return
    removeMember.mutate(member.id)
  }

  return (
    <Table>
      {TABLE_HEADERS}
      <TableBody>
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            canAct={canActOnMember(canManage, currentUserId, member)}
            currentUserRole={currentUserRole}
            removePending={removeMember.isPending}
            onRemove={handleRemove}
          />
        ))}
      </TableBody>
    </Table>
  )
}

interface MemberRowProps {
  readonly member: MemberData
  readonly canAct: boolean
  readonly currentUserRole: string
  readonly removePending: boolean
  readonly onRemove: (member: MemberData) => void
}

function MemberRow({
  member,
  canAct,
  currentUserRole,
  removePending,
  onRemove,
}: MemberRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div
          className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-full text-sm font-medium"
          aria-hidden="true"
        >
          {getInitials(member.name)}
        </div>
      </TableCell>
      <TableCell className="font-medium">{member.name}</TableCell>
      <TableCell className="text-muted-foreground">{member.email}</TableCell>
      <TableCell>
        {canAct ? (
          <ChangeRoleSelect
            memberId={member.id}
            currentRole={member.role}
            callerRole={currentUserRole}
          />
        ) : (
          <span className="text-sm">
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
        )}
      </TableCell>
      <TableCell>
        {canAct && (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive size-9"
            onClick={() => onRemove(member)}
            disabled={removePending}
            aria-label={`Remover ${member.name}`}
          >
            {removePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function MembersTableSkeleton() {
  return (
    <Table>
      {TABLE_HEADERS}
      <TableBody>
        {Array.from({ length: 3 }, (_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="size-9 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="size-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
