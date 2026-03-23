'use client'

import { useAuth } from '@/features/auth/hooks/use-auth'
import { cn } from '@/lib/utils'
import { useCallback, useMemo, useState } from 'react'

import { useConversations } from '../hooks/use-conversations'
import { useMessages } from '../hooks/use-messages'
import { useSocket } from '../hooks/use-socket'
import { ChatActionsProvider } from './chat-actions-context'
import { ChatArea } from './chat-area'
import { ContactProfile } from './contact-profile'
import { ConversationList } from './conversation-list'
import { TransferAgentModal } from './transfer-agent-modal'
import { WhatsappStatus } from './whatsapp-status'

type MobileView = 'list' | 'chat'

export function ChatLayout() {
  const { user } = useAuth()
  const { socket, isConnected, onlineAgents } = useSocket()

  const {
    conversations,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    filters,
    setFilters,
    assignConversation,
    transferConversation,
    returnToQueue,
    returnToBot,
    closeConversation,
  } = useConversations(socket)

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null)
  const [mobileView, setMobileView] = useState<MobileView>('list')
  const [showProfile, setShowProfile] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)

  const {
    messages,
    contact,
    conversation: conversationDetails,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    sendMessage,
    emitTyping,
    typingUser,
  } = useMessages(selectedConversationId, socket, user?.id)

  const currentUserId = user?.id ?? ''

  const activeConversation =
    conversationDetails ??
    conversations.find((c) => c.id === selectedConversationId) ??
    null

  const chatActionsValue = useMemo(
    () => ({
      assignConversation,
      transferConversation,
      returnToQueue,
      returnToBot,
      closeConversation,
      onlineAgents,
    }),
    [
      assignConversation,
      transferConversation,
      returnToQueue,
      returnToBot,
      closeConversation,
      onlineAgents,
    ]
  )

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id)
    setMobileView('chat')
    setShowProfile(false)
  }, [])

  const handleBack = useCallback(() => {
    setMobileView('list')
    setShowProfile(false)
  }, [])

  const handleOpenProfile = useCallback(() => {
    setShowProfile(true)
  }, [])

  const handleCloseProfile = useCallback(() => {
    setShowProfile(false)
  }, [])

  const handleOpenTransferModal = useCallback(() => {
    setShowTransferModal(true)
  }, [])

  const handleRetryConversations = useCallback(() => {
    setFilters({})
  }, [setFilters])

  return (
    <ChatActionsProvider value={chatActionsValue}>
      <div className="bg-background flex h-full w-full overflow-hidden">
        {/* Connection status indicator */}
        <div className="fixed left-1/2 top-2 z-50 -translate-x-1/2">
          <WhatsappStatus isConnected={isConnected} />
        </div>

        {/* Desktop Layout */}
        <div className="hidden w-full md:flex">
          <div className="border-border w-80 shrink-0 border-r lg:w-96">
            <ConversationList
              conversations={conversations}
              activeConversationId={selectedConversationId}
              isLoading={isConversationsLoading}
              isError={isConversationsError}
              filters={filters}
              onSelectConversation={handleSelectConversation}
              onFiltersChange={setFilters}
              onRetry={handleRetryConversations}
            />
          </div>

          <div
            className={cn(
              'flex-1 transition-all duration-300',
              showProfile ? 'mr-80' : ''
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
              onSendMessage={sendMessage}
              onEmitTyping={emitTyping}
              onBack={handleBack}
              onOpenProfile={handleOpenProfile}
              onTransfer={handleOpenTransferModal}
            />
          </div>

          <div
            className={cn(
              'border-border fixed right-0 top-0 z-40 h-full w-80 border-l transition-transform duration-300',
              showProfile ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {activeConversation && (
              <ContactProfile
                contact={contact}
                conversation={activeConversation}
                onClose={handleCloseProfile}
              />
            )}
          </div>
        </div>

        {/* Mobile Layout */}
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
              onSelectConversation={handleSelectConversation}
              onFiltersChange={setFilters}
              onRetry={handleRetryConversations}
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
              onSendMessage={sendMessage}
              onEmitTyping={emitTyping}
              onBack={handleBack}
              onOpenProfile={handleOpenProfile}
              onTransfer={handleOpenTransferModal}
            />
          </div>

          <div
            className={cn(
              'bg-card absolute inset-0 z-30 transition-transform duration-300',
              showProfile && mobileView === 'chat'
                ? 'translate-x-0'
                : 'translate-x-full'
            )}
          >
            {activeConversation && (
              <ContactProfile
                contact={contact}
                conversation={activeConversation}
                onClose={handleCloseProfile}
              />
            )}
          </div>
        </div>

        <TransferAgentModal
          open={showTransferModal}
          onOpenChange={setShowTransferModal}
          conversationId={selectedConversationId}
        />
      </div>
    </ChatActionsProvider>
  )
}
