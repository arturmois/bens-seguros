'use client'

import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface TableErrorStateProps {
  readonly message?: string
  readonly onRetry: () => void
}

export function TableErrorState({
  message = 'Erro ao carregar dados.',
  onRetry,
}: TableErrorStateProps) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border">
      <p className="text-destructive text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1 size-4" />
        Tentar novamente
      </Button>
    </div>
  )
}
