'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  LogOut,
  MoreVertical,
  RefreshCw,
  UserCheck,
  UserPlus,
} from 'lucide-react'

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
          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors md:h-9 md:w-9">
            <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
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
