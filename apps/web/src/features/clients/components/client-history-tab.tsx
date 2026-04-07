'use client'

import { Clock } from 'lucide-react'

interface ClientHistoryTabProps {
  readonly clientId: string
}

export function ClientHistoryTab({
  clientId: _clientId,
}: ClientHistoryTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Clock className="text-muted-foreground mb-3 h-10 w-10" />
      <p className="text-muted-foreground text-sm">
        O histórico de alterações deste cliente aparecerá aqui.
      </p>
    </div>
  )
}
