'use client'

import { Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { AiAgentData } from '../types'
import { useDeleteAiAgent } from '../hooks/use-ai-agents'

interface DeleteAgentDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly agent: AiAgentData | null
}

export function DeleteAgentDialog({
  open,
  onOpenChange,
  agent,
}: DeleteAgentDialogProps) {
  const deleteAgent = useDeleteAiAgent()
  const hasLinkedChannels = (agent?.linkedChannelCount ?? 0) > 0

  function handleDelete() {
    if (!agent) return

    deleteAgent.mutate(agent.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir Agente</DialogTitle>
          <DialogDescription>
            {hasLinkedChannels ? (
              <>
                O agente <strong>{agent?.name}</strong> não pode ser excluído
                pois está vinculado a{' '}
                <Badge variant="secondary">
                  {agent?.linkedChannelCount}{' '}
                  {agent?.linkedChannelCount === 1 ? 'canal' : 'canais'}
                </Badge>
                . Desvincule o agente de todos os canais antes de excluí-lo.
              </>
            ) : (
              <>
                Deseja excluir o agente <strong>{agent?.name}</strong>? Esta
                ação não pode ser desfeita.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {!hasLinkedChannels && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Excluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
