'use client'

import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import type { ConversationData } from '../types'
import { ChannelIcon } from './channel-icon'
import { ConversationStatusBadge } from './conversation-status-badge'

export function getDisplayName(conversation: ConversationData): string {
  return conversation.whatsappPhone ?? 'Contato'
}

interface ConversationListItemProps {
  readonly conversation: ConversationData
  readonly isActive: boolean
  readonly unreadCount: number
  readonly onSelect: () => void
}

export function ConversationListItem({
  conversation,
  isActive,
  unreadCount,
  onSelect,
}: ConversationListItemProps) {
  const displayName = getDisplayName(conversation)
  const isWaiting = conversation.status === 'WAITING_HUMAN'

  return (
    <button
      onClick={onSelect}
      aria-label={`Conversa com ${displayName}${unreadCount > 0 ? `, ${unreadCount} mensagens não lidas` : ''}`}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
        'hover:bg-sidebar-hover',
        isActive && 'bg-sidebar-accent',
        isWaiting && 'border-(--chat-waiting) border-l-4'
      )}
    >
      <div className="relative shrink-0">
        <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
          <span className="text-primary text-base font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            {conversation.channelType && (
              <span className="shrink-0">
                <ChannelIcon channelType={conversation.channelType} size={14} />
              </span>
            )}
            <span className="text-foreground truncate font-medium">
              {displayName}
            </span>
            <ConversationStatusBadge status={conversation.status} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {conversation.lastMessageAt && (
              <span className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                  addSuffix: false,
                  locale: ptBR,
                })}
              </span>
            )}
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount > 99 ? 'Mais de 99' : unreadCount} não lidas`}
                className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-muted-foreground truncate text-sm">
            {conversation.lastMessageText ?? 'Sem mensagens'}
          </p>
          {conversation.status === 'HUMAN_ACTIVE' &&
            conversation.assignedToName && (
              <span
                aria-label={`Atendido por ${conversation.assignedToName}`}
                className="text-muted-foreground shrink-0 text-xs"
              >
                {conversation.assignedToName}
              </span>
            )}
        </div>
      </div>
    </button>
  )
}
