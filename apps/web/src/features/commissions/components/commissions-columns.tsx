'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'

import { formatCurrency, formatDate, formatPercentage } from '@/lib/formatters'

import type { CommissionData } from '../lib/types'
import { CommissionStatusBadge } from './commission-status-badge'

export function createCommissionColumns(): ColumnDef<CommissionData>[] {
  return [
    {
      accessorKey: 'salespersonName',
      header: ({ column }) => (
        <button
          type="button"
          className="-ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Vendedor
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.salespersonName ?? '-'}
        </span>
      ),
      enableHiding: false,
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
      accessorKey: 'clientName',
      header: 'Cliente',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.clientName ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'premiumValueInCents',
      header: () => <div className="text-right">Prêmio</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.premiumValueInCents)}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'percentageInBasisPoints',
      header: () => <div className="text-right">%</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {formatPercentage(row.original.percentageInBasisPoints)}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'commissionValueInCents',
      header: ({ column }) => (
        <div className="text-right">
          <button
            type="button"
            className="-ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Valor (R$)
            <ArrowUpDown className="size-3.5 opacity-40" />
          </button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatCurrency(row.original.commissionValueInCents)}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <button
          type="button"
          className="-ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => <CommissionStatusBadge status={row.original.status} />,
      enableHiding: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <button
          type="button"
          className="-ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Data
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ]
}
