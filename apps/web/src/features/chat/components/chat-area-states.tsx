'use client'

import { Skeleton } from '@/components/ui/skeleton'
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

export function MessagesError() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <AlertCircle className="text-destructive h-10 w-10" />
      <p className="text-muted-foreground text-sm">
        Erro ao carregar mensagens
      </p>
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="bg-(--chat-bg) flex h-full flex-col items-center justify-center">
      <div className="text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
          <Send className="text-primary h-10 w-10" />
        </div>
        <h2 className="text-foreground mb-2 text-xl font-semibold">
          Selecione uma conversa
        </h2>
        <p className="text-muted-foreground max-w-sm">
          Escolha uma conversa na lista ao lado para começar a trocar mensagens
        </p>
      </div>
    </div>
  )
}
