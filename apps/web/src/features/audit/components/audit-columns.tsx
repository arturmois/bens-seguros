'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/formatters'

import {
  ACTION_LABELS,
  ACTION_VARIANT,
  ENTITY_TYPE_LABELS,
} from '../lib/constants'
import type { AuditLogData } from '../lib/types'

interface ColumnActions {
  readonly onView: (entry: AuditLogData) => void
}

export function createAuditColumns(
  actions: ColumnActions
): ColumnDef<AuditLogData>[] {
  return [
    {
      accessorKey: 'createdAt',
      header: 'Data',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.original.createdAt)}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'action',
      header: 'Ação',
      cell: ({ row }) => (
        <Badge
          variant={ACTION_VARIANT[row.original.action] ?? 'default'}
          size="sm"
        >
          {ACTION_LABELS[row.original.action] ?? row.original.action}
        </Badge>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'entityType',
      header: 'Entidade',
      cell: ({ row }) => (
        <span className="text-sm">
          {ENTITY_TYPE_LABELS[row.original.entityType] ??
            row.original.entityType}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'entityId',
      header: 'ID',
      cell: ({ row }) => (
        <span className="truncate font-mono text-xs">
          {row.original.entityId ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => {
            e.stopPropagation()
            actions.onView(row.original)
          }}
          aria-label="Ver detalhes"
        >
          <Eye className="size-3.5" />
        </Button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
  ]
}
