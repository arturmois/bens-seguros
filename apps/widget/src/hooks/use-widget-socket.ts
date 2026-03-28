import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

import { CHAT_SERVER_URL, SOCKET_EVENTS } from '../lib/constants'
import type { WidgetMessage } from '../lib/widget-api'
import { fetchMessages } from '../lib/widget-api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSenderType(value: string): value is WidgetMessage['senderType'] {
  return (
    value === 'CLIENT' ||
    value === 'AGENT' ||
    value === 'BOT' ||
    value === 'SYSTEM'
  )
}

function parseSenderType(value: unknown): WidgetMessage['senderType'] {
  if (typeof value === 'string' && isSenderType(value)) {
    return value
  }
  return 'SYSTEM'
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypingState {
  readonly isTyping: boolean
  readonly name: string | null
}

interface UseWidgetSocketResult {
  readonly messages: WidgetMessage[]
  readonly isConnected: boolean
  readonly typing: TypingState
  readonly hasMore: boolean
  readonly isLoadingMessages: boolean
  readonly sendMessage: (text: string) => void
  readonly emitTyping: () => void
  readonly loadMoreMessages: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWidgetSocket(
  conversationId: string | null,
  visitorToken: string | null
): UseWidgetSocketResult {
  const [messages, setMessages] = useState<WidgetMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [typing, setTyping] = useState<TypingState>({
    isTyping: false,
    name: null,
  })
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadDoneRef = useRef(false)

  // Load initial messages via REST
  useEffect(() => {
    if (!conversationId || !visitorToken || initialLoadDoneRef.current) return
    initialLoadDoneRef.current = true

    async function loadInitial(): Promise<void> {
      setIsLoadingMessages(true)
      const result = await fetchMessages(conversationId!, visitorToken!)
      setIsLoadingMessages(false)

      if (result) {
        setMessages(result.messages)
        setHasMore(result.hasMore)
      }
    }

    void loadInitial()
  }, [conversationId, visitorToken])

  // Connect socket
  useEffect(() => {
    if (!conversationId || !visitorToken) return

    const socket = io(`${CHAT_SERVER_URL}/widget`, {
      auth: { token: visitorToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Incoming message from agent/bot/system
    socket.on(
      SOCKET_EVENTS.WIDGET_INCOMING_MESSAGE,
      (data: Record<string, unknown>) => {
        const message: WidgetMessage = {
          id: String(data['id'] ?? ''),
          conversationId: String(data['conversationId'] ?? ''),
          senderType: parseSenderType(data['senderType']),
          senderName:
            typeof data['senderName'] === 'string' ? data['senderName'] : null,
          text: typeof data['text'] === 'string' ? data['text'] : null,
          type: typeof data['type'] === 'string' ? data['type'] : 'TEXT',
          status:
            typeof data['status'] === 'string' ? data['status'] : 'DELIVERED',
          createdAt:
            typeof data['createdAt'] === 'string'
              ? data['createdAt']
              : new Date().toISOString(),
        }

        setMessages((prev) => [...prev, message])

        // Clear typing indicator when a message arrives
        setTyping({ isTyping: false, name: null })
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = null
        }
      }
    )

    // Typing indicator from agent/bot
    socket.on(SOCKET_EVENTS.WIDGET_TYPING, (data: Record<string, unknown>) => {
      const name = typeof data['name'] === 'string' ? data['name'] : 'Atendente'

      setTyping({ isTyping: true, name })

      // Auto-clear after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTyping({ isTyping: false, name: null })
        typingTimeoutRef.current = null
      }, 3000)
    })

    // Conversation status update
    socket.on(
      SOCKET_EVENTS.WIDGET_CONVERSATION_UPDATED,
      (_data: Record<string, unknown>) => {
        // Could handle conversation closed, status changes, etc.
        // For now, we just let the UI continue normally
      }
    )

    return () => {
      socket.disconnect()
      socketRef.current = null
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversationId, visitorToken])

  // Send message with optimistic update
  const sendMessage = useCallback(
    (text: string) => {
      if (!socketRef.current || !conversationId) return

      // Optimistic message
      const optimisticId = `optimistic-${Date.now()}`
      const optimisticMessage: WidgetMessage = {
        id: optimisticId,
        conversationId,
        senderType: 'CLIENT',
        senderName: null,
        text,
        type: 'TEXT',
        status: 'SENDING',
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, optimisticMessage])

      socketRef.current.emit(
        SOCKET_EVENTS.WIDGET_SEND_MESSAGE,
        { text },
        (response: { success: boolean; data?: { id: string } }) => {
          if (response.success && response.data) {
            // Replace optimistic message with real ID
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === optimisticId
                  ? { ...msg, id: response.data!.id, status: 'DELIVERED' }
                  : msg
              )
            )
          } else {
            // Mark as failed
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === optimisticId ? { ...msg, status: 'FAILED' } : msg
              )
            )
          }
        }
      )
    },
    [conversationId]
  )

  // Emit typing event
  const emitTyping = useCallback(() => {
    if (!socketRef.current) return
    socketRef.current.emit(SOCKET_EVENTS.WIDGET_TYPING_START)
  }, [])

  // Load more messages (older)
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !visitorToken || !hasMore || isLoadingMessages)
      return

    const firstMessage = messages[0]
    if (!firstMessage) return

    setIsLoadingMessages(true)
    const result = await fetchMessages(
      conversationId,
      visitorToken,
      firstMessage.id
    )
    setIsLoadingMessages(false)

    if (result) {
      setMessages((prev) => [...result.messages, ...prev])
      setHasMore(result.hasMore)
    }
  }, [conversationId, visitorToken, hasMore, isLoadingMessages, messages])

  return {
    messages,
    isConnected,
    typing,
    hasMore,
    isLoadingMessages,
    sendMessage,
    emitTyping,
    loadMoreMessages,
  }
}
