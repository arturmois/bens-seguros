'use client'

import { Clock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { RelatedEntityTableSkeleton } from '@/components/shared/related-entity-table-skeleton'
import { ACTION_LABELS, ACTION_VARIANT } from '@/features/audit/lib/constants'
import { useEntityAuditLogs } from '../hooks/use-entity-audit-logs'

interface ClientHistoryTabProps {
  readonly clientId: string
}

const COLS = 4

function summarizeDiff(before: unknown, after: unknown): string {
  if (!before && !after) return '-'
  if (!before && after) return 'Registro criado'
  if (before && !after) return 'Registro removido'
  const b = (before ?? {}) as Record<string, unknown>
  const a = (after ?? {}) as Record<string, unknown>
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  const changed = [...keys].filter(
    (k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])
  )
  if (changed.length === 0) return '-'
  if (changed.length <= 3) return `${changed.join(', ')} alterado(s)`
  return `${changed.length} campos alterados`
}

export function ClientHistoryTab({ clientId }: ClientHistoryTabProps) {
  const { data, isLoading, isError, refetch } = useEntityAuditLogs({
    entityType: 'Client',
    entityId: clientId,
    limit: 10,
  })
  if (isLoading) return <RelatedEntityTableSkeleton cols={COLS} />
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-destructive text-sm">Erro ao carregar histórico.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }
  const items = data?.data ?? []
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Clock className="size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          Nenhuma alteração registrada
        </p>
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quando</TableHead>
          <TableHead>Ação</TableHead>
          <TableHead>Por</TableHead>
          <TableHead>Detalhes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="text-sm">
              {new Date(entry.createdAt).toLocaleString('pt-BR')}
            </TableCell>
            <TableCell>
              <Badge variant={ACTION_VARIANT[entry.action] ?? 'default'}>
                {ACTION_LABELS[entry.action] ?? entry.action}
              </Badge>
            </TableCell>
            <TableCell className="text-sm">
              {entry.userId ?? 'Sistema'}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {summarizeDiff(entry.before, entry.after)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
