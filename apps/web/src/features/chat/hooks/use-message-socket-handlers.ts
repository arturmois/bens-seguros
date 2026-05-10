'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS, CHAT_LIMITS } from '@repo/shared'

import { MESSAGES_KEY } from '../lib/constants'
import {
  playNotificationSound,
  showBrowserNotification,
} from '../lib/notifications'
import type {
  ConversationWithDetails,
  MessageData,
  MessageStatus,
} from '../types'
import { isRecord } from '../lib/type-guards'

export function useMessageSocketHandlers(
  conversationId: string | null,
  socket: Socket | null,
  queryClient: QueryClient
) {
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleIncomingMessage = useCallback(
    (payload: unknown) => {
      if (!isIncomingMessageEvent(payload)) return
      if (payload.conversationId !== conversationId) return
      queryClient.setQueryData<ConversationWithDetails>(
        [MESSAGES_KEY, conversationId],
        (prev) => {
          if (!prev) return prev
          const alreadyExists = prev.messages.data.some(
            (m) => m.id === payload.id
          )
          if (alreadyExists) return prev
          return {
            ...prev,
            messages: {
              ...prev.messages,
              data: [...prev.messages.data, payload],
            },
          }
        }
      )
      if (
        typeof document !== 'undefined' &&
        document.hidden &&
        payload.senderType !== 'AGENT'
      ) {
        playNotificationSound()
        showBrowserNotification(
          typeof payload.senderName === 'string'
            ? payload.senderName
            : 'Nova mensagem',
          typeof payload.text === 'string' ? payload.text : 'Mensagem recebida'
        )
      }
    },
    [queryClient, conversationId]
  )
  const handleMessageStatus = useCallback(
    (payload: unknown) => {
      if (!isMessageStatusEvent(payload)) return
      if (payload.conversationId !== conversationId) return
      queryClient.setQueryData<ConversationWithDetails>(
        [MESSAGES_KEY, conversationId],
        (prev) => {
          if (!prev) return prev
          const updated = prev.messages.data.map((msg) => {
            if (msg.id !== payload.messageId) return msg
            return { ...msg, status: payload.status }
          })
          return { ...prev, messages: { ...prev.messages, data: updated } }
        }
      )
    },
    [queryClient, conversationId]
  )
  const handleTyping = useCallback(
    (payload: unknown) => {
      if (!isTypingEvent(payload)) return
      if (payload.conversationId !== conversationId) return
      setTypingUser(payload.name)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser(null)
      }, CHAT_LIMITS.TYPING_TIMEOUT_MS)
    },
    [conversationId]
  )
  useEffect(() => {
    if (!socket) return
    socket.on(SOCKET_EVENTS.INCOMING_MESSAGE, handleIncomingMessage)
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS, handleMessageStatus)
    socket.on(SOCKET_EVENTS.TYPING, handleTyping)
    return () => {
      socket.off(SOCKET_EVENTS.INCOMING_MESSAGE, handleIncomingMessage)
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS, handleMessageStatus)
      socket.off(SOCKET_EVENTS.TYPING, handleTyping)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [socket, handleIncomingMessage, handleMessageStatus, handleTyping])
  return { typingUser }
}
function isIncomingMessageEvent(data: unknown): data is MessageData {
  if (!isRecord(data)) return false
  return (
    typeof data['id'] === 'string' && typeof data['conversationId'] === 'string'
  )
}

interface MessageStatusEvent {
  conversationId: string
  messageId: string
  status: MessageStatus
}

function isMessageStatusEvent(data: unknown): data is MessageStatusEvent {
  if (!isRecord(data)) return false
  return (
    typeof data['conversationId'] === 'string' &&
    typeof data['messageId'] === 'string' &&
    typeof data['status'] === 'string'
  )
}

interface TypingEvent {
  conversationId: string
  userId: string
  name: string
}

function isTypingEvent(data: unknown): data is TypingEvent {
  if (!isRecord(data)) return false
  return (
    typeof data['conversationId'] === 'string' &&
    typeof data['userId'] === 'string' &&
    typeof data['name'] === 'string'
  )
}
