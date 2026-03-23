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
            Selecione o agente que ira assumir esta conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          {availableAgents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                <Users className="text-muted-foreground h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-foreground text-sm font-medium">
                  Nenhum agente disponivel
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Nao ha outros agentes online no momento para receber a
                  transferencia.
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
                      ? 'border-primary bg-primary/5 ring-primary ring-2'
                      : 'border-border hover:bg-accent'
                  )}
                >
                  <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <span className="text-primary text-sm font-semibold">
                      {agent.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-medium">
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
              : 'Confirmar Transferencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
