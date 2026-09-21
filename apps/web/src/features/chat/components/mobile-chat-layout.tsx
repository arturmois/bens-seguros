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

type MobileView = 'list' | 'chat'

interface MobileChatLayoutProps {
  readonly conversations: ConversationData[]
  readonly activeConversation: ConversationData | null
  readonly contact: ContactData | null
  readonly messages: MessageData[]
  readonly currentUserId: string
  readonly typingUser: string | null
  readonly selectedConversationId: string | null
  readonly mobileView: MobileView
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

export function MobileChatLayout({
  conversations,
  activeConversation,
  contact,
  messages,
  currentUserId,
  typingUser,
  selectedConversationId,
  mobileView,
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
}: MobileChatLayoutProps) {
  return (
    <div className="flex w-full md:hidden">
      <div
        className={cn(
          'absolute inset-0 z-10 transition-transform duration-300',
          mobileView === 'list' ? 'translate-x-0' : '-translate-x-full'
        )}
      >
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
      <div
        className={cn(
          'absolute inset-0 z-20 transition-transform duration-300',
          mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full'
        )}
      >
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
          'absolute inset-0 z-30 bg-card transition-transform duration-300',
          showProfile && mobileView === 'chat'
            ? 'translate-x-0'
            : 'translate-x-full'
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
