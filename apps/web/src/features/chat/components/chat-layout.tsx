'use client';

import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';

import { useConversations } from '../hooks/use-conversations';
import { useMessages } from '../hooks/use-messages';
import { useSocket } from '../hooks/use-socket';
import { ChatArea } from './chat-area';
import { ContactProfile } from './contact-profile';
import { ConversationList } from './conversation-list';
import { WhatsappStatus } from './whatsapp-status';

type MobileView = 'list' | 'chat';

export function ChatLayout() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const {
    conversations,
    isLoading: isConversationsLoading,
    isError: isConversationsError,
    filters,
    setFilters,
    assignConversation,
    transferConversation,
    returnToQueue,
    closeConversation,
  } = useConversations(socket);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [showProfile, setShowProfile] = useState(false);

  const {
    messages,
    contact,
    conversation: conversationDetails,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    sendMessage,
    emitTyping,
    typingUser,
  } = useMessages(selectedConversationId, socket);

  const currentUserId = user?.id ?? '';

  const activeConversation =
    conversationDetails ?? conversations.find((c) => c.id === selectedConversationId) ?? null;

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setMobileView('chat');
    setShowProfile(false);
  }, []);

  const handleBack = useCallback(() => {
    setMobileView('list');
    setShowProfile(false);
  }, []);

  const handleOpenProfile = useCallback(() => {
    setShowProfile(true);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setShowProfile(false);
  }, []);

  const handleAssign = useCallback(() => {
    if (!selectedConversationId) return;
    assignConversation.mutate(selectedConversationId);
  }, [selectedConversationId, assignConversation]);

  const handleTransfer = useCallback(() => {
    // Transfer requires selecting a target agent.
    // For now this is a placeholder -- a modal to pick an agent would be added in a future iteration.
    if (!selectedConversationId) return;
    transferConversation.mutate({
      id: selectedConversationId,
      toUserId: '',
      toUserName: '',
    });
  }, [selectedConversationId, transferConversation]);

  const handleReturnToQueue = useCallback(() => {
    if (!selectedConversationId) return;
    returnToQueue.mutate(selectedConversationId);
  }, [selectedConversationId, returnToQueue]);

  const handleCloseConversation = useCallback(() => {
    if (!selectedConversationId) return;
    closeConversation.mutate(selectedConversationId);
  }, [selectedConversationId, closeConversation]);

  const handleRetryConversations = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  return (
    <div className="bg-background flex h-screen w-full overflow-hidden">
      {/* Connection status indicator */}
      <div className="fixed left-1/2 top-2 z-50 -translate-x-1/2">
        <WhatsappStatus isConnected={isConnected} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden w-full md:flex">
        <div className="border-border w-80 flex-shrink-0 border-r lg:w-96">
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

        <div className={cn('flex-1 transition-all duration-300', showProfile ? 'mr-80' : '')}>
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
            onAssign={handleAssign}
            onTransfer={handleTransfer}
            onReturnToQueue={handleReturnToQueue}
            onCloseConversation={handleCloseConversation}
          />
        </div>

        <div
          className={cn(
            'border-border fixed right-0 top-0 z-40 h-full w-80 border-l transition-transform duration-300',
            showProfile ? 'translate-x-0' : 'translate-x-full',
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
            mobileView === 'list' ? 'translate-x-0' : '-translate-x-full',
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
            mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full',
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
            onAssign={handleAssign}
            onTransfer={handleTransfer}
            onReturnToQueue={handleReturnToQueue}
            onCloseConversation={handleCloseConversation}
          />
        </div>

        <div
          className={cn(
            'bg-card absolute inset-0 z-30 transition-transform duration-300',
            showProfile && mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full',
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
    </div>
  );
}
