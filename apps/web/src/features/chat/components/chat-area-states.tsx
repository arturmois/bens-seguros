'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, Send } from 'lucide-react'

export function MessagesLoading() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}
        >
          <Skeleton
            className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`}
          />
        </div>
      ))}
    </div>
  )
}

interface MessagesErrorProps {
  readonly onRetry: () => void
}

export function MessagesError({ onRetry }: MessagesErrorProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <p className="text-muted-foreground text-sm">
        Erro ao carregar mensagens
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-(--chat-bg)">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Send className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mb-2 font-semibold text-foreground text-xl">
          Selecione uma conversa
        </h2>
        <p className="max-w-sm text-muted-foreground">
          Escolha uma conversa na lista ao lado para começar a trocar mensagens
        </p>
      </div>
    </div>
  )
}
