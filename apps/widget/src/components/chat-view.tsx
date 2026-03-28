import { useEffect, useRef } from 'react'

import { useWidgetSocket } from '../hooks/use-widget-socket'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'

interface ChatViewProps {
  readonly conversationId: string
  readonly visitorToken: string
  readonly primaryColor: string
}

export function ChatView({
  conversationId,
  visitorToken,
  primaryColor,
}: ChatViewProps): React.JSX.Element {
  const {
    messages,
    typing,
    sendMessage,
    emitTyping,
    hasMore,
    isLoadingMessages,
    loadMoreMessages,
  } = useWidgetSocket(conversationId, visitorToken)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(0)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  // Handle scroll to top for loading more messages
  const handleScroll = (): void => {
    const container = messagesContainerRef.current
    if (!container) return

    if (container.scrollTop === 0 && hasMore && !isLoadingMessages) {
      void loadMoreMessages()
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {isLoadingMessages && messages.length === 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'var(--widget-text-muted)',
              fontSize: '13px',
            }}
          >
            Carregando mensagens...
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={() => void loadMoreMessages()}
            disabled={isLoadingMessages}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--widget-primary)',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '8px',
              textAlign: 'center',
              opacity: isLoadingMessages ? 0.5 : 1,
            }}
          >
            {isLoadingMessages
              ? 'Carregando...'
              : 'Carregar mensagens anteriores'}
          </button>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            primaryColor={primaryColor}
          />
        ))}

        {/* Typing indicator */}
        {typing.isTyping && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              maxWidth: '75%',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '3px',
                alignItems: 'center',
              }}
            >
              <TypingDot delay={0} />
              <TypingDot delay={150} />
              <TypingDot delay={300} />
            </div>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--widget-text-muted)',
              }}
            >
              {typing.name ?? 'Atendente'} está digitando...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <MessageInput onSend={sendMessage} onTyping={emitTyping} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Typing dot animation component
// ---------------------------------------------------------------------------

function TypingDot({ delay }: { readonly delay: number }): React.JSX.Element {
  return (
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'var(--widget-text-muted)',
        display: 'inline-block',
        animation: `widgetTypingBounce 1.2s ease-in-out ${delay}ms infinite`,
      }}
    >
      <style>
        {`@keyframes widgetTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }`}
      </style>
    </span>
  )
}
