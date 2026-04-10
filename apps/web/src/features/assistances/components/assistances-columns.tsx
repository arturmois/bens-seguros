'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

import { formatDate } from '@/lib/formatters'

import { getAssistanceTypeLabel } from '../lib/constants'
import type { AssistanceData } from '../lib/types'
import { AssistanceStatusBadge } from './assistance-status-badge'

export function createAssistanceColumns(): ColumnDef<AssistanceData>[] {
  return [
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Tipo
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {getAssistanceTypeLabel(row.original.type)}
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'clientName',
      header: 'Cliente',
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate">
          {row.original.clientName ?? '-'}
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
      cell: ({ row }) => <AssistanceStatusBadge status={row.original.status} />,
      enableHiding: false,
    },
    {
      accessorKey: 'requestedAt',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Data Solicitação
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => formatDate(row.original.requestedAt),
    },
    {
      accessorKey: 'address',
      header: 'Endereço',
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-48 truncate">
          {row.original.address ?? '-'}
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
  ]
}
