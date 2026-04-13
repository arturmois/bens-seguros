'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Ban, Eye, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { hasPermission } from '@/lib/permissions'
import type { Role } from '@repo/auth/roles'
import { formatCurrency, formatDate } from '@/lib/formatters'

import {
  POLICY_BRANCH_LABELS,
  POLICY_STATUS_BADGE_VARIANT,
  POLICY_STATUS_LABELS,
} from '../lib/constants'
import type { PolicyData } from '../lib/types'

interface ColumnActions {
  readonly onView: (id: string) => void
  readonly onCancel: (policy: PolicyData) => void
}

export function createPolicyColumns(
  actions: ColumnActions,
  role: Role
): ColumnDef<PolicyData>[] {
  return [
    {
      accessorKey: 'policyNumber',
      header: 'Nº Apólice',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.policyNumber}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'branch',
      header: 'Ramo',
      cell: ({ row }) => (
        <Badge variant="outline">
          {POLICY_BRANCH_LABELS[row.original.branch]}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={POLICY_STATUS_BADGE_VARIANT[row.original.status]}>
          {POLICY_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'premiumValueInCents',
      header: () => <span className="text-right">Valor</span>,
      cell: ({ row }) => (
        <span className="text-right">
          {formatCurrency(row.original.premiumValueInCents)}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'validity',
      header: 'Vigência',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.startDate)} –{' '}
          {formatDate(row.original.endDate)}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'createdAt',
      header: 'Criado em',
      cell: ({ row }) => formatDate(row.original.createdAt),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const policy = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Ações"
                />
              }
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(policy.id)}>
                <Eye className="mr-2 size-4" />
                Ver
              </DropdownMenuItem>
              {policy.status === 'ACTIVE' &&
                hasPermission(role, 'policies:update') && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => actions.onCancel(policy)}
                  >
                    <Ban className="mr-2 size-4" />
                    Cancelar
                  </DropdownMenuItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
  ]
}
