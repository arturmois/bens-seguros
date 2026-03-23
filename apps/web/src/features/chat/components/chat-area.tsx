'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

import type { ContactData, ConversationData, MessageData } from '../types'
import { ChatHeader } from './chat-header'
import { EmptyState, MessagesError, MessagesLoading } from './chat-area-states'
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
  readonly hasOlderMessages: boolean
  readonly onSendMessage: (text: string) => void
  readonly onEmitTyping: () => void
  readonly onLoadOlderMessages: () => Promise<void>
  readonly onBack: () => void
  readonly onOpenProfile: () => void
  readonly onTransfer: () => void
}

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
  onSendMessage,
  onEmitTyping,
  onLoadOlderMessages,
  onBack,
  onOpenProfile,
  onTransfer,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const observerTargetRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (
        e.currentTarget.scrollTop === 0 &&
        hasOlderMessages &&
        !isLoadingOlder
      ) {
        void onLoadOlderMessages()
      }
    },
    [hasOlderMessages, isLoadingOlder, onLoadOlderMessages]
  )

  useEffect(() => {
    const target = observerTargetRef.current
    if (!target) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry) {
          isAtBottomRef.current = entry.isIntersecting
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (isAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

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
        className="chat-scrollbar flex-1 overflow-y-auto p-3 md:p-4"
        onScroll={handleScroll}
      >
        {isLoading && <MessagesLoading />}
        {isError && !isLoading && <MessagesError />}
        {!isLoading && !isError && (
          <div className="space-y-3">
            {isLoadingOlder && (
              <div className="flex justify-center py-2">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isFromCurrentUser={message.senderId === currentUserId}
              />
            ))}
            <div ref={observerTargetRef} className="h-1" />
            <div ref={messagesEndRef} />
          </div>
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
