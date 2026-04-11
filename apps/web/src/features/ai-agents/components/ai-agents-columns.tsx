'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import type { AiAgentData } from '../types'
import { PROVIDER_LABELS } from '../lib/constants'

interface ColumnActions {
  readonly onEdit: (agent: AiAgentData) => void
  readonly onDuplicate: (agent: AiAgentData) => void
  readonly onDelete: (agent: AiAgentData) => void
}

function formatChannelCount(count: number): string {
  if (count === 0) return 'Nenhum'
  if (count === 1) return '1 canal'
  return `${count} canais`
}

export function createAiAgentColumns(
  actions: ColumnActions
): ColumnDef<AiAgentData>[] {
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
      cell: ({ row }) => {
        const agent = row.original
        return (
          <div className="flex flex-col">
            <span className="font-medium">{agent.name}</span>
            {agent.description && (
              <span className="text-muted-foreground text-xs">
                {agent.description}
              </span>
            )}
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {PROVIDER_LABELS[row.original.provider] ?? row.original.provider}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'linkedChannelCount',
      header: ({ column }) => (
        <button
          type="button"
          className="hover:text-foreground -ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Canais
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => formatChannelCount(row.original.linkedChannelCount),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const agent = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Ações do agente ${agent.name}`}
                />
              }
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(agent)}>
                <Pencil className="mr-2 size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onDuplicate(agent)}>
                <Copy className="mr-2 size-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => actions.onDelete(agent)}
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
