'use client'

import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/formatters'

import { useAuditLogs } from '../hooks/use-audit-logs'
import type { AuditLogEntry, AuditLogFilters } from '../lib/constants'
import { AuditDetailModal } from './audit-detail-modal'

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
  hasPreviousPage: boolean
  onNextPage: (cursor: string) => void
  onPreviousPage: () => void
}

function AuditTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Entidade</TableHead>
            <TableHead className="hidden sm:table-cell">ID</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 5 }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function AuditTable({
  filters,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
}: AuditTableProps) {
  const { data, isLoading } = useAuditLogs(filters)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)

  if (isLoading) return <AuditTableSkeleton />

  const items = data?.data ?? []
  const meta = data?.meta

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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Ação</TableHead>
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
      </div>

      <nav
        aria-label="Paginação de auditoria"
        className="flex items-center justify-between"
      >
        <p className="text-muted-foreground text-sm">
          {meta?.total ?? 0}{' '}
          {(meta?.total ?? 0) === 1 ? 'registro' : 'registros'} no total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPreviousPage}
            onClick={onPreviousPage}
          >
            <ChevronLeft className="mr-1 size-4" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta?.nextCursor}
            onClick={() => {
              if (meta?.nextCursor) onNextPage(meta.nextCursor)
            }}
          >
            Próximo <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </nav>

      <AuditDetailModal
        entry={selectedEntry}
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
      />
    </>
  )
}
