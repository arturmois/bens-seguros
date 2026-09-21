'use client'

import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCallback, useMemo, useState } from 'react'

import { useConversations } from '../hooks/use-conversations'
import { useMessages } from '../hooks/use-messages'
import { useSocket } from '../hooks/use-socket'
import { useUnreadCounts } from '../hooks/use-unread-counts'
import { ChatActionsProvider } from './chat-actions-context'
import { DesktopChatLayout } from './desktop-chat-layout'
import { MobileChatLayout } from './mobile-chat-layout'
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
  const { unreadCounts } = useUnreadCounts(socket)
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
    refetch: refetchMessages,
    sendMessage,
    emitTyping,
    typingUser,
    loadOlderMessages,
    isLoadingOlder,
    hasOlderMessages,
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
  const sharedLayoutProps = {
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
    onSelectConversation: handleSelectConversation,
    onFiltersChange: setFilters,
    onRetryConversations: handleRetryConversations,
    onRetryMessages: refetchMessages,
    onSendMessage: sendMessage,
    onEmitTyping: emitTyping,
    onLoadOlderMessages: loadOlderMessages,
    onBack: handleBack,
    onOpenProfile: handleOpenProfile,
    onCloseProfile: handleCloseProfile,
    onTransfer: handleOpenTransferModal,
  }
  return (
    <ChatActionsProvider value={chatActionsValue}>
      <div className="flex h-full w-full overflow-hidden bg-background">
        {/* Connection status indicator */}
        <div className="fixed top-2 left-1/2 z-50 -translate-x-1/2">
          <WhatsappStatus isConnected={isConnected} />
        </div>
        <DesktopChatLayout {...sharedLayoutProps} />
        <MobileChatLayout {...sharedLayoutProps} mobileView={mobileView} />
        <TransferAgentModal
          open={showTransferModal}
          onOpenChange={setShowTransferModal}
          conversationId={selectedConversationId}
        />
      </div>
    </ChatActionsProvider>
  )
}
