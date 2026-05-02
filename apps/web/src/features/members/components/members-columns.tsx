'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/formatters'

import { ROLE_LABELS } from '../lib/member-schemas'
import type { MemberData } from '../types'
import { ChangeRoleSelect } from './change-role-select'

interface ColumnActions {
  readonly canAct: (member: MemberData) => boolean
  readonly currentUserRole: string
  readonly onRemove: (member: MemberData) => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

export function createMemberColumns(
  actions: ColumnActions
): ColumnDef<MemberData>[] {
  return [
    {
      id: 'avatar',
      header: '',
      cell: ({ row }) => (
        <div
          className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-sm font-medium"
          aria-hidden="true"
        >
          {getInitials(row.original.name ?? row.original.email)}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 56,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nome
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
      sortingFn: (a, b) =>
        (a.original.name ?? '').localeCompare(b.original.name ?? ''),
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          E-mail
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Cargo',
      cell: ({ row }) => {
        const member = row.original
        if (actions.canAct(member)) {
          return (
            <ChangeRoleSelect
              memberId={member.id}
              currentRole={member.role}
              callerRole={actions.currentUserRole}
            />
          )
        }
        return (
          <span className="text-sm">
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
        )
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Desde
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const member = row.original
        if (!actions.canAct(member)) return null
        return (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive size-7"
            onClick={(e) => {
              e.stopPropagation()
              actions.onRemove(member)
            }}
            aria-label={`Remover ${member.name ?? member.email}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
  ]
}
