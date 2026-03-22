'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/formatters'

import { useAuditLogs } from '../hooks/use-audit-logs'
import { AuditDetailModal } from './audit-detail-modal'
import type { AuditLogEntry, AuditLogFilters } from '../types'

const ACTION_VARIANT: Record<
  string,
  'default' | 'success' | 'error' | 'warning' | 'info'
> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  APPROVE: 'success',
  REJECT: 'warning',
}

interface AuditTableProps {
  filters: AuditLogFilters
  onLoadMore: (cursor: string) => void
}

function AuditTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function AuditTable({ filters, onLoadMore }: AuditTableProps) {
  const { data, isLoading } = useAuditLogs(filters)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)

  if (isLoading) return <AuditTableSkeleton />

  const items = data?.data ?? []
  const nextCursor = data?.meta?.nextCursor ?? null

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground text-sm">
          Nenhum registro de auditoria encontrado.
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Acao</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead className="hidden sm:table-cell">ID</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-muted-foreground text-xs">
                {formatDate(entry.createdAt)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={ACTION_VARIANT[entry.action] ?? 'default'}
                  size="sm"
                >
                  {entry.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{entry.entityType}</TableCell>
              <TableCell className="hidden truncate font-mono text-xs sm:table-cell">
                {entry.entityId ?? '-'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSelectedEntry(entry)}
                  aria-label="Ver detalhes"
                >
                  <Eye className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {nextCursor ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLoadMore(nextCursor)}
          >
            Carregar mais
          </Button>
        </div>
      ) : null}
      <AuditDetailModal
        entry={selectedEntry}
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
      />
    </>
  )
}
