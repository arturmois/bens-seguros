'use client'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import {
  LogOut,
  MoreVertical,
  RefreshCw,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'

import type { ConversationData } from '../types'
import { useChatActions } from './chat-actions-context'

interface HeaderActionsProps {
  readonly conversation: ConversationData
  readonly currentUserId: string
  readonly onTransfer: () => void
}

export function HeaderActions({
  conversation,
  currentUserId,
  onTransfer,
}: HeaderActionsProps) {
  const { assignConversation, returnToQueue, closeConversation } =
    useChatActions()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  if (conversation.status === 'WAITING_HUMAN') {
    return (
      <Button
        size="sm"
        onClick={() => assignConversation.mutate(conversation.id)}
        className="gap-1.5"
      >
        <UserPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Assumir</span>
      </Button>
    )
  }

  if (conversation.status === 'HUMAN_ACTIVE') {
    const isCurrentAgent = conversation.assignedTo === currentUserId

    if (!isCurrentAgent) {
      return (
        <span className="text-muted-foreground text-xs">
          Atendido por {conversation.assignedToName ?? 'outro agente'}
        </span>
      )
    }

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Ações da conversa"
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onTransfer}>
              <UserCheck className="mr-2 h-4 w-4" />
              Transferir
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => returnToQueue.mutate(conversation.id)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Devolver para fila
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowCloseConfirm(true)}
              variant="destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Finalizar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar conversa?</AlertDialogTitle>
              <AlertDialogDescription>
                A conversa será encerrada. O cliente poderá iniciar uma nova
                conversa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose
                render={<Button variant="outline">Cancelar</Button>}
              />
              <Button
                variant="destructive"
                onClick={() => {
                  closeConversation.mutate(conversation.id)
                  setShowCloseConfirm(false)
                }}
              >
                Encerrar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return null
}
