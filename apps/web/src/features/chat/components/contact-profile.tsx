'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { ExternalLink, Phone, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import type { ContactData, ConversationData } from '../types'
import { ConversationStatusBadge } from './conversation-status-badge'

interface ContactProfileProps {
  readonly contact: ContactData | null
  readonly conversation: ConversationData
  readonly onClose: () => void
}

function getDisplayName(
  contact: ContactData | null,
  conversation: ConversationData
): string {
  if (contact?.pushName) return contact.pushName
  if (conversation.whatsappPhone) return conversation.whatsappPhone
  return 'Contato'
}

export function ContactProfile({
  contact,
  conversation,
  onClose,
}: ContactProfileProps) {
  const displayName = getDisplayName(contact, conversation)

  return (
    <div className="bg-card flex h-full flex-col">
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-foreground font-semibold">Perfil do contato</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="chat-scrollbar flex-1 overflow-y-auto">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center px-4 py-8">
          <div className="relative mb-4">
            <div
              className={cn(
                'bg-primary/10 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full shadow-lg',
                contact?.profilePicUrl && 'relative'
              )}
            >
              {contact?.profilePicUrl ? (
                <Image
                  src={contact.profilePicUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <span className="text-primary text-3xl font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <h3 className="text-foreground text-xl font-semibold">
            {displayName}
          </h3>
          <div className="mt-2">
            <ConversationStatusBadge status={conversation.status} />
          </div>
          {conversation.status === 'HUMAN_ACTIVE' &&
            conversation.assignedToName && (
              <p className="text-muted-foreground mt-1 text-sm">
                Atendido por {conversation.assignedToName}
              </p>
            )}
        </div>

        <Separator />

        {/* Contact Info */}
        <div className="space-y-4 px-4 py-4">
          <h4 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Informacoes de contato
          </h4>

          {(contact?.whatsappPhone ?? conversation.whatsappPhone) && (
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                <Phone className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">
                  {contact?.whatsappPhone ?? conversation.whatsappPhone}
                </p>
                <p className="text-muted-foreground text-xs">WhatsApp</p>
              </div>
            </div>
          )}
        </div>

        {contact?.clientId && (
          <>
            <Separator />
            <div className="px-4 py-4">
              <Link href={`/clients/${contact.clientId}`}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver cliente
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
