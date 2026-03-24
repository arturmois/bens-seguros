'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS, CHAT_LIMITS } from '@repo/shared'

import { chatApi } from '../lib/chat-api'
import { MESSAGES_KEY } from '../lib/constants'
import { isRecord } from '../lib/type-guards'
import type {
  ConversationData,
  ConversationWithDetails,
  ContactData,
  MessageData,
} from '../types'
import { useMessageSocketHandlers } from './use-message-socket-handlers'

interface UseMessagesReturn {
  readonly messages: MessageData[]
  readonly contact: ContactData | null
  readonly conversation: ConversationData | null
  readonly isLoading: boolean
  readonly isError: boolean
  readonly sendMessage: (text: string) => void
  readonly emitTyping: () => void
  readonly typingUser: string | null
  readonly loadOlderMessages: () => Promise<void>
  readonly isLoadingOlder: boolean
  readonly hasOlderMessages: boolean
}

export function useMessages(
  conversationId: string | null,
  socket: Socket | null,
  currentUserId?: string
): UseMessagesReturn {
  const queryClient = useQueryClient()
  const lastTypingEmitRef = useRef<number>(0)

  const query = useQuery({
    queryKey: [MESSAGES_KEY, conversationId],
    queryFn: async (): Promise<ConversationWithDetails> => {
      const response = await chatApi.get<ConversationWithDetails>(
        `/chat/conversations/${conversationId}`
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: conversationId !== null && conversationId.length > 0,
  })

  const { typingUser } = useMessageSocketHandlers(
    conversationId,
    socket,
    queryClient
  )

  // Subscribe/unsubscribe to conversation room + mark as read
  useEffect(() => {
    if (!socket?.connected || !conversationId) return

    socket.emit(SOCKET_EVENTS.SUBSCRIBE_CONVERSATION, { conversationId })

    void chatApi.post(`/chat/conversations/${conversationId}/read`, {})

    return () => {
      socket.emit(SOCKET_EVENTS.UNSUBSCRIBE_CONVERSATION, { conversationId })
    }
  }, [socket, conversationId])

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket?.connected || !conversationId || !text.trim()) return

      const optimisticMessage: MessageData = {
        id: `temp-${Date.now()}`,
        conversationId,
        tenantId: '',
        senderType: 'AGENT',
        senderName: null,
        senderId: currentUserId ?? null,
        text: text.trim(),
        type: 'TEXT',
        status: 'PENDING',
        mediaUrl: null,
        externalId: null,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<ConversationWithDetails>(
        [MESSAGES_KEY, conversationId],
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: {
              ...prev.messages,
              data: [...prev.messages.data, optimisticMessage],
            },
          }
        }
      )

      socket.emit(
        SOCKET_EVENTS.SEND_MESSAGE,
        { conversationId, text: text.trim() },
        (response: unknown) => {
          if (!isSendMessageAck(response) || !response.success) {
            markOptimisticFailed(
              queryClient,
              conversationId,
              optimisticMessage.id
            )
            return
          }

          replaceOptimisticId(
            queryClient,
            conversationId,
            optimisticMessage.id,
            response.data
          )
        }
      )
    },
    [socket, conversationId, queryClient]
  )

  // Emit typing start (debounced)
  const emitTyping = useCallback(() => {
    if (!socket?.connected || !conversationId) return

    const now = Date.now()
    if (now - lastTypingEmitRef.current < CHAT_LIMITS.TYPING_DEBOUNCE_MS) return

    lastTypingEmitRef.current = now
    socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId })
  }, [socket, conversationId])

  const sendMessageWithTypingReset = useCallback(
    (text: string) => {
      lastTypingEmitRef.current = 0
      sendMessage(text)
    },
    [sendMessage]
  )

  const [hasOlderMessages, setHasOlderMessages] = useState(true)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)

  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || isLoadingOlder || !hasOlderMessages) return
    const currentMessages = queryClient.getQueryData<ConversationWithDetails>([
      MESSAGES_KEY,
      conversationId,
    ])
    const oldestMessage = currentMessages?.messages.data[0]
    if (!oldestMessage) return

    setIsLoadingOlder(true)
    try {
      const response = await chatApi.get<ConversationWithDetails>(
        `/chat/conversations/${conversationId}?before=${oldestMessage.id}`
      )
      const olderMessages = response.data.messages.data
      if (olderMessages.length === 0) {
        setHasOlderMessages(false)
        return
      }
      queryClient.setQueryData<ConversationWithDetails>(
        [MESSAGES_KEY, conversationId],
        (prev) => {
          if (!prev) return prev
          return {
            ...prev,
            messages: {
              ...prev.messages,
              data: [...olderMessages, ...prev.messages.data],
            },
          }
        }
      )
    } finally {
      setIsLoadingOlder(false)
    }
  }, [conversationId, queryClient, isLoadingOlder, hasOlderMessages])

  const rawMessages = query.data?.messages.data ?? []
  const messages = useMemo(() => {
    const seen = new Set<string>()
    return rawMessages.filter((msg) => {
      if (seen.has(msg.id)) return false
      seen.add(msg.id)
      return true
    })
  }, [rawMessages])

  return {
    messages,
    contact: query.data?.contact ?? null,
    conversation: query.data?.conversation ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    sendMessage: sendMessageWithTypingReset,
    emitTyping,
    typingUser,
    loadOlderMessages,
    isLoadingOlder,
    hasOlderMessages,
  }
}

// --- helpers ---

function markOptimisticFailed(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  optimisticId: string
): void {
  queryClient.setQueryData<ConversationWithDetails>(
    [MESSAGES_KEY, conversationId],
    (prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: {
          ...prev.messages,
          data: prev.messages.data.map((msg) =>
            msg.id === optimisticId
              ? { ...msg, status: 'FAILED' as const }
              : msg
          ),
        },
      }
    }
  )
}

function replaceOptimisticId(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  optimisticId: string,
  responseData: unknown
): void {
  queryClient.setQueryData<ConversationWithDetails>(
    [MESSAGES_KEY, conversationId],
    (prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: {
          ...prev.messages,
          data: prev.messages.data.map((msg) =>
            msg.id === optimisticId && isRecord(responseData)
              ? {
                  ...msg,
                  id: String(responseData['id'] ?? msg.id),
                  status: 'SENT' as const,
                }
              : msg
          ),
        },
      }
    }
  )
}

// --- type guards ---

interface SendMessageAck {
  success: boolean
  data?: unknown
}

function isSendMessageAck(data: unknown): data is SendMessageAck {
  if (!isRecord(data)) return false
  return typeof data['success'] === 'boolean'
}
