'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

import type { ContactData, ConversationData, MessageData } from '../types'
import { EmptyState, MessagesError, MessagesLoading } from './chat-area-states'
import { ChatHeader } from './chat-header'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'

interface ChatAreaProps {
  readonly conversation: ConversationData | null
  readonly contact: ContactData | null
  readonly messages: MessageData[]
  readonly currentUserId: string
  readonly typingUser: string | null
  readonly isLoading: boolean
  readonly isError: boolean
  readonly isLoadingOlder: boolean
  readonly onRetryMessages: () => void
  readonly hasOlderMessages: boolean
  readonly onSendMessage: (text: string) => void
  readonly onEmitTyping: () => void
  readonly onLoadOlderMessages: () => Promise<void>
  readonly onBack: () => void
  readonly onOpenProfile: () => void
  readonly onTransfer: () => void
}

const NEAR_BOTTOM_THRESHOLD = 120
const NEAR_TOP_THRESHOLD = 80

export function ChatArea({
  conversation,
  contact,
  messages,
  currentUserId,
  typingUser,
  isLoading,
  isError,
  isLoadingOlder,
  hasOlderMessages,
  onRetryMessages,
  onSendMessage,
  onEmitTyping,
  onLoadOlderMessages,
  onBack,
  onOpenProfile,
  onTransfer,
}: ChatAreaProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevMessageCountRef = useRef(messages.length)
  const wasLoadingRef = useRef(isLoading)
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 80,
    overscan: 5,
    getItemKey: (index) => messages[index]?.id ?? index,
  })
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (messages.length === 0) return
      virtualizer.scrollToIndex(messages.length - 1, { behavior })
    },
    [virtualizer, messages.length]
  )
  const updateBottomState = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD
  }, [])
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      updateBottomState()
      if (
        e.currentTarget.scrollTop <= NEAR_TOP_THRESHOLD &&
        hasOlderMessages &&
        !isLoadingOlder
      ) {
        void onLoadOlderMessages()
      }
    },
    [hasOlderMessages, isLoadingOlder, onLoadOlderMessages, updateBottomState]
  )
  useEffect(() => {
    const prevCount = prevMessageCountRef.current
    prevMessageCountRef.current = messages.length
    if (messages.length === 0) return
    const isNewMessage = messages.length > prevCount
    if (isNewMessage && isAtBottomRef.current) {
      scrollToBottom('smooth')
    }
  }, [messages.length, scrollToBottom])
  useEffect(() => {
    const wasLoading = wasLoadingRef.current
    wasLoadingRef.current = isLoading
    if (wasLoading && !isLoading && !isError && messages.length > 0) {
      scrollToBottom('instant')
    }
  }, [isLoading, isError, messages.length, scrollToBottom])
  if (!conversation) {
    return <EmptyState />
  }
  const canSendMessage =
    conversation.status === 'HUMAN_ACTIVE' &&
    conversation.assignedTo === currentUserId
  return (
    <div className="bg-(--chat-bg) flex h-full flex-col">
      <ChatHeader
        conversation={conversation}
        contact={contact}
        currentUserId={currentUserId}
        typingUser={typingUser}
        onBack={onBack}
        onOpenProfile={onOpenProfile}
        onTransfer={onTransfer}
      />
      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="chat-scrollbar flex-1 overflow-y-auto p-3 md:p-4"
        onScroll={handleScroll}
      >
        {isLoading && <MessagesLoading />}
        {isError && !isLoading && <MessagesError onRetry={onRetryMessages} />}
        {!isLoading && !isError && (
          <>
            {isLoadingOlder && (
              <div className="flex justify-center py-2">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            )}
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const message = messages[virtualRow.index]
                if (!message) return null
                const isFromCurrentUser =
                  message.senderId === currentUserId ||
                  message.senderType === 'BOT'
                return (
                  <div
                    key={virtualRow.key}
                    ref={virtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-3"
                  >
                    <MessageBubble
                      message={message}
                      isFromCurrentUser={isFromCurrentUser}
                    />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <MessageInput
        onSendMessage={onSendMessage}
        onEmitTyping={onEmitTyping}
        disabled={!canSendMessage}
      />
    </div>
  )
}
