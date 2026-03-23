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
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Bot,
  LogOut,
  MoreVertical,
  RefreshCw,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import Image from 'next/image'

import type { ContactData, ConversationData } from '../types'
import { useChatActions } from './chat-actions-context'
import { ConversationStatusBadge } from './conversation-status-badge'
import { TypingIndicator } from './typing-indicator'

interface ChatHeaderProps {
  readonly conversation: ConversationData
  readonly contact: ContactData | null
  readonly currentUserId: string
  readonly typingUser: string | null
  readonly onBack: () => void
  readonly onOpenProfile: () => void
  readonly onTransfer: () => void
}

function getContactDisplayName(
  contact: ContactData | null,
  conversation: ConversationData
): string {
  if (contact?.pushName) return contact.pushName
  if (conversation.whatsappPhone) return conversation.whatsappPhone
  return 'Contato'
}

function HeaderActions({
  conversation,
  currentUserId,
  onTransfer,
}: {
  readonly conversation: ConversationData
  readonly currentUserId: string
  readonly onTransfer: () => void
}) {
  const { assignConversation, returnToBot, returnToQueue, closeConversation } =
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
              onClick={() => returnToBot.mutate(conversation.id)}
            >
              <Bot className="mr-2 h-4 w-4" />
              Voltar para IA
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
                A conversa sera encerrada. O cliente podera iniciar uma nova
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

export function ChatHeader({
  conversation,
  contact,
  currentUserId,
  typingUser,
  onBack,
  onOpenProfile,
  onTransfer,
}: ChatHeaderProps) {
  const displayName = getContactDisplayName(contact, conversation)

  return (
    <div className="border-border bg-card border-b">
      <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 transition-opacity hover:opacity-80 md:gap-3"
          >
            <div className="relative">
              <div
                className={cn(
                  'bg-primary/10 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full md:h-10 md:w-10',
                  contact?.profilePicUrl && 'bg-muted relative'
                )}
              >
                {contact?.profilePicUrl ? (
                  <Image
                    src={contact.profilePicUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <span className="text-primary text-sm font-semibold md:text-base">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="text-foreground text-sm font-semibold md:text-base">
                  {displayName}
                </h2>
                <ConversationStatusBadge status={conversation.status} />
              </div>
              <p className="text-muted-foreground text-xs">
                {conversation.whatsappPhone ?? ''}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <HeaderActions
            conversation={conversation}
            currentUserId={currentUserId}
            onTransfer={onTransfer}
          />
        </div>
      </div>

      <TypingIndicator typingUser={typingUser} />
    </div>
  )
}
