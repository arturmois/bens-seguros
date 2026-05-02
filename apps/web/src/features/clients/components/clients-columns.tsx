'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Eye, MoreHorizontal, Trash2 } from 'lucide-react'

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
import { formatDate } from '@/lib/formatters'
import { formatDocument } from '@/lib/masks'
import { PERSON_TYPE_BADGE_VARIANT, PERSON_TYPE_LABELS } from '../lib/constants'
import type { ClientData } from '../lib/types'

interface ColumnActions {
  readonly onView: (id: string) => void
  readonly onDelete: (id: string) => void
}

export function createClientColumns(
  actions: ColumnActions,
  role: Role
): ColumnDef<ClientData>[] {
  return [
    {
      accessorKey: 'legalName',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Nome legal
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.original.legalName}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'document',
      header: 'Documento',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDocument(row.original.document)}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'personType',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge variant={PERSON_TYPE_BADGE_VARIANT[row.original.personType]}>
          {PERSON_TYPE_LABELS[row.original.personType]}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'activePolicyCount',
      header: 'Apólices ativas',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.activePolicyCount}</span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'contactCount',
      header: 'Contatos',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.contactCount}</span>
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
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const client = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Ações"
                />
              }
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onView(client.id)}>
                <Eye className="mr-2 size-4" />
                Ver
              </DropdownMenuItem>
              {hasPermission(role, 'clients:delete') && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => actions.onDelete(client.id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir
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
