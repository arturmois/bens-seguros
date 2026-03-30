'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/formatters'

import type { AuditLogEntry } from '../lib/constants'

interface AuditDetailModalProps {
  entry: AuditLogEntry | null
  open: boolean
  onClose: () => void
}

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

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (data == null) return null
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
      <pre className="bg-muted max-h-48 overflow-auto rounded-lg p-3 text-xs">
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
              {entry.action}
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
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
