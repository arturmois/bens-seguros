'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDate } from '@/lib/formatters'

import { ACTION_LABELS, ACTION_VARIANT } from '../lib/constants'
import type { AuditLogData } from '../lib/types'

interface AuditDetailModalProps {
  readonly entry: AuditLogData | null
  readonly open: boolean
  readonly onClose: () => void
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (data == null) return null
  return (
    <div>
      <p className="mb-1 font-medium text-muted-foreground text-xs">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-lg bg-muted p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function AuditDetailModal({
  entry,
  open,
  onClose,
}: AuditDetailModalProps) {
  if (!entry) return null
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhe do registro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6">
          <div className="flex items-center gap-2">
            <Badge variant={ACTION_VARIANT[entry.action] ?? 'default'}>
              {ACTION_LABELS[entry.action] ?? entry.action}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {entry.entityType}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Data</p>
              <p>{formatDate(entry.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ID da Entidade</p>
              <p className="truncate font-mono text-xs">
                {entry.entityId ?? '-'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">IP</p>
              <p className="font-mono text-xs">{entry.ipAddress ?? '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">User Agent</p>
              <p className="truncate text-xs">{entry.userAgent ?? '-'}</p>
            </div>
          </div>
          <JsonBlock label="Antes" data={entry.before ?? null} />
          <JsonBlock label="Depois" data={entry.after ?? null} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
