'use client'

import { cn } from '@/lib/utils'

import type {
  ContactData,
  ConversationData,
  ConversationFilters,
  MessageData,
} from '../types'
import { ChatArea } from './chat-area'
import { ContactProfile } from './contact-profile'
import { ConversationList } from './conversation-list'

interface DesktopChatLayoutProps {
  readonly conversations: ConversationData[]
  readonly activeConversation: ConversationData | null
  readonly contact: ContactData | null
  readonly messages: MessageData[]
  readonly currentUserId: string
  readonly typingUser: string | null
  readonly selectedConversationId: string | null
  readonly isConversationsLoading: boolean
  readonly isConversationsError: boolean
  readonly isMessagesLoading: boolean
  readonly isMessagesError: boolean
  readonly isLoadingOlder: boolean
  readonly hasOlderMessages: boolean
  readonly showProfile: boolean
  readonly filters: ConversationFilters
  readonly unreadCounts: Record<string, number>
  readonly onSelectConversation: (id: string) => void
  readonly onFiltersChange: (filters: ConversationFilters) => void
  readonly onRetryConversations: () => void
  readonly onRetryMessages: () => void
  readonly onSendMessage: (text: string) => void
  readonly onEmitTyping: () => void
  readonly onLoadOlderMessages: () => Promise<void>
  readonly onBack: () => void
  readonly onOpenProfile: () => void
  readonly onCloseProfile: () => void
  readonly onTransfer: () => void
}

export function DesktopChatLayout({
  conversations,
  activeConversation,
  contact,
  messages,
  currentUserId,
  typingUser,
  selectedConversationId,
  isConversationsLoading,
  isConversationsError,
  isMessagesLoading,
  isMessagesError,
  isLoadingOlder,
  hasOlderMessages,
  showProfile,
  filters,
  unreadCounts,
  onSelectConversation,
  onFiltersChange,
  onRetryConversations,
  onRetryMessages,
  onSendMessage,
  onEmitTyping,
  onLoadOlderMessages,
  onBack,
  onOpenProfile,
  onCloseProfile,
  onTransfer,
}: DesktopChatLayoutProps) {
  return (
    <div className="hidden w-full md:flex">
      <div className="border-border w-80 shrink-0 border-r lg:w-96">
        <ConversationList
          conversations={conversations}
          activeConversationId={selectedConversationId}
          isLoading={isConversationsLoading}
          isError={isConversationsError}
          filters={filters}
          unreadCounts={unreadCounts}
          onSelectConversation={onSelectConversation}
          onFiltersChange={onFiltersChange}
          onRetry={onRetryConversations}
        />
      </div>
      <div className="flex-1">
        <ChatArea
          conversation={activeConversation}
          contact={contact}
          messages={messages}
          currentUserId={currentUserId}
          typingUser={typingUser}
          isLoading={isMessagesLoading}
          isError={isMessagesError}
          isLoadingOlder={isLoadingOlder}
          hasOlderMessages={hasOlderMessages}
          onRetryMessages={onRetryMessages}
          onSendMessage={onSendMessage}
          onEmitTyping={onEmitTyping}
          onLoadOlderMessages={onLoadOlderMessages}
          onBack={onBack}
          onOpenProfile={onOpenProfile}
          onTransfer={onTransfer}
        />
      </div>
      <div
        className={cn(
          'border-border shrink-0 overflow-hidden border-l transition-[width] duration-300',
          showProfile ? 'w-80' : 'w-0'
        )}
      >
        {activeConversation && (
          <ContactProfile
            contact={contact}
            conversation={activeConversation}
            onClose={onCloseProfile}
          />
        )}
      </div>
    </div>
  )
}
