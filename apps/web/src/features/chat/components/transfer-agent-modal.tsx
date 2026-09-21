'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { cn } from '@/lib/utils'

import { useChatActions } from './chat-actions-context'

interface TransferAgentModalProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly conversationId: string | null
}

export function TransferAgentModal({
  open,
  onOpenChange,
  conversationId,
}: TransferAgentModalProps) {
  const { user } = useAuth()
  const { transferConversation, onlineAgents } = useChatActions()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const availableAgents = onlineAgents.filter(
    (agent) => agent.userId !== user?.id
  )
  const selectedAgent = availableAgents.find(
    (agent) => agent.userId === selectedAgentId
  )
  function handleConfirmTransfer() {
    if (!conversationId || !selectedAgent) return
    transferConversation.mutate(
      {
        id: conversationId,
        toUserId: selectedAgent.userId,
        toUserName: selectedAgent.name,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setSelectedAgentId(null)
        },
      }
    )
  }
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setSelectedAgentId(null)
    }
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
          <DialogDescription>
            Selecione o agente que irá assumir esta conversa.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4">
          {availableAgents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground text-sm">
                  Nenhum agente disponível
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Não há outros agentes online no momento para receber a
                  transferência.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {availableAgents.map((agent) => (
                <button
                  key={agent.userId}
                  type="button"
                  onClick={() => setSelectedAgentId(agent.userId)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    selectedAgentId === agent.userId
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-semibold text-primary text-sm">
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {agent.name}
                    </p>
                    <p className="text-muted-foreground text-xs">Online</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmTransfer}
            disabled={!selectedAgentId || transferConversation.isPending}
          >
            {transferConversation.isPending
              ? 'Transferindo...'
              : 'Confirmar Transferência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
