'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Eye, MoreHorizontal, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import { formatDate } from '@/lib/formatters'

import { formatClaimNumber } from '../lib/constants'
import type { ClaimData } from '../lib/types'
import { ClaimPriorityBadge } from './claim-priority-badge'
import { ClaimStatusBadge } from './claim-status-badge'

interface ColumnActions {
  readonly onView: (id: string) => void
  readonly onDelete: (id: string) => void
}

export function createClaimColumns(
  actions: ColumnActions
): ColumnDef<ClaimData>[] {
  return [
    {
      accessorKey: 'claimNumber',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Sinistro
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {formatClaimNumber(row.original.claimNumber, row.original.createdAt)}
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'clientName',
      header: 'Cliente',
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate">
          {row.original.clientName ?? row.original.clientId}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'policyNumber',
      header: 'Apólice',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.policyNumber ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => <ClaimStatusBadge status={row.original.status} />,
      enableHiding: false,
    },
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Prioridade
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <ClaimPriorityBadge priority={row.original.priority} />
      ),
    },
    {
      accessorKey: 'incidentLocation',
      header: 'Local',
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-48 truncate">
          {row.original.incidentLocation ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Criado em
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
      enableHiding: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const claim = row.original
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
              <DropdownMenuItem onClick={() => actions.onView(claim.id)}>
                <Eye className="mr-2 size-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => actions.onDelete(claim.id)}
              >
                <Trash2 className="mr-2 size-4" />
                Excluir
              </DropdownMenuItem>
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
