'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/formatters'

import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
  type ProposalData,
} from '../lib/constants'
import { ProposalActionButtons } from './proposal-action-buttons'

interface ColumnActions {
  readonly isAdvancing: boolean
  readonly onAdvance: (id: string) => void
  readonly onLost: (id: string) => void
}

export function createProposalColumns(
  actions: ColumnActions
): ColumnDef<ProposalData>[] {
  return [
    {
      accessorKey: 'clientName',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Cliente
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.clientName ?? row.original.clientId}
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'branch',
      header: 'Ramo',
      cell: ({ row }) => (
        <Badge variant="outline">{BRANCH_LABELS[row.original.branch]}</Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'stage',
      header: 'Estágio',
      cell: ({ row }) => (
        <Badge variant={STAGE_BADGE_VARIANT[row.original.stage]}>
          {STAGE_LABELS[row.original.stage]}
        </Badge>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'boardType',
      header: 'Tipo',
      cell: ({ row }) => BOARD_TYPE_LABELS[row.original.boardType],
      enableSorting: false,
    },
    {
      accessorKey: 'premiumValueInCents',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Valor
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-right">
          {formatCurrency(row.original.premiumValueInCents)}
        </span>
      ),
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
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div
          className="flex justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ProposalActionButtons
            stage={row.original.stage}
            onAdvance={() => actions.onAdvance(row.original.id)}
            onLost={() => actions.onLost(row.original.id)}
            isAdvancing={actions.isAdvancing}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 140,
    },
  ]
}
