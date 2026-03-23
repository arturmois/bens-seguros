'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'

import type { ContactData, ConversationData } from '../types'
import { ConversationStatusBadge } from './conversation-status-badge'
import { HeaderActions } from './header-actions'
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
