'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, MoreHorizontal, Pencil, Power } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { formatDate } from '@/lib/formatters'

import type { InsurerData } from '../lib/types'

interface ColumnActions {
  readonly onEdit: (insurer: InsurerData) => void
  readonly onToggleActive: (insurer: InsurerData) => void
}

export function createInsurerColumns(
  actions: ColumnActions
): ColumnDef<InsurerData>[] {
  return [
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
        <span className="font-medium">{row.original.name}</span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Código
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.code ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.active ? 'default' : 'secondary'}>
          {row.original.active ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Atualizado em
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => formatDate(row.original.updatedAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const insurer = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Ações da seguradora ${insurer.name}`}
                />
              }
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(insurer)}>
                <Pencil className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onToggleActive(insurer)}>
                <Power className="mr-2 size-4" />
                {insurer.active ? 'Inativar' : 'Ativar'}
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
