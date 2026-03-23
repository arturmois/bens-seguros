'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@repo/shared'
import { toast } from 'sonner'

import { chatApi } from '../lib/chat-api'
import { CONVERSATIONS_KEY } from '../lib/constants'
import { isRecord } from '../lib/type-guards'
import type { ConversationData, ConversationFilters, ListMeta } from '../types'

interface ConversationListResponse {
  data: ConversationData[]
  meta: ListMeta
}

function buildConversationsUrl(filters: ConversationFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
  if (filters.cursor) params.set('cursor', filters.cursor)
  params.set('limit', String(filters.limit ?? 50))
  return `/chat/conversations?${params.toString()}`
}

export function useConversations(socket: Socket | null) {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ConversationFilters>({})

  const query = useQuery({
    queryKey: [CONVERSATIONS_KEY, filters],
    queryFn: async (): Promise<ConversationListResponse> => {
      const response = await chatApi.get<ConversationData[]>(
        buildConversationsUrl(filters)
      )
      return {
        data: response.data,
        meta: (response.meta ?? {
          total: 0,
          nextCursor: null,
        }) satisfies ListMeta,
      }
    },
    staleTime: 60_000,
  })

  const handleConversationUpdated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
  }, [queryClient])

  const handleIncomingMessage = useCallback(
    (payload: unknown) => {
      if (!isIncomingMessagePayload(payload)) return

      queryClient.setQueryData<ConversationListResponse>(
        [CONVERSATIONS_KEY, filters],
        (prev) => {
          if (!prev) return prev

          const updated = prev.data.map((conv) => {
            if (conv.id !== payload.conversationId) return conv
            return {
              ...conv,
              lastMessageText: payload.text ?? conv.lastMessageText,
              lastMessageAt: payload.createdAt ?? conv.lastMessageAt,
            }
          })

          return { ...prev, data: updated }
        }
      )
    },
    [queryClient, filters]
  )

  useEffect(() => {
    if (!socket) return

    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated)
    socket.on(SOCKET_EVENTS.INCOMING_MESSAGE, handleIncomingMessage)

    return () => {
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated)
      socket.off(SOCKET_EVENTS.INCOMING_MESSAGE, handleIncomingMessage)
    }
  }, [socket, handleConversationUpdated, handleIncomingMessage])

  const assignConversation = useMutation({
    mutationFn: async (id: string) => {
      const response = await chatApi.post<ConversationData>(
        `/chat/conversations/${id}/assign`,
        {}
      )
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
      toast.success('Conversa atribuída com sucesso')
    },
    onError: () => {
      toast.error('Erro ao atribuir conversa')
    },
  })

  const transferConversation = useMutation({
    mutationFn: async ({
      id,
      toUserId,
      toUserName,
    }: {
      id: string
      toUserId: string
      toUserName: string
    }) => {
      const response = await chatApi.post<ConversationData>(
        `/chat/conversations/${id}/transfer`,
        {
          toUserId,
          toUserName,
        }
      )
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
      toast.success('Conversa transferida com sucesso')
    },
    onError: () => {
      toast.error('Erro ao transferir conversa')
    },
  })

  const returnToQueue = useMutation({
    mutationFn: async (id: string) => {
      const response = await chatApi.post<ConversationData>(
        `/chat/conversations/${id}/return`,
        {}
      )
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
      toast.success('Conversa devolvida à fila')
    },
    onError: () => {
      toast.error('Erro ao devolver conversa à fila')
    },
  })

  const returnToBot = useMutation({
    mutationFn: async (id: string) => {
      const response = await chatApi.post<ConversationData>(
        `/chat/conversations/${id}/return-to-bot`,
        {}
      )
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
      toast.success('Conversa devolvida para a IA')
    },
    onError: () => {
      toast.error('Erro ao devolver conversa para a IA')
    },
  })

  const closeConversation = useMutation({
    mutationFn: async (id: string) => {
      const response = await chatApi.post<ConversationData>(
        `/chat/conversations/${id}/close`,
        {}
      )
      return response.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] })
      toast.success('Conversa encerrada com sucesso')
    },
    onError: () => {
      toast.error('Erro ao encerrar conversa')
    },
  })

  return {
    conversations: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    filters,
    setFilters,
    assignConversation,
    transferConversation,
    returnToQueue,
    returnToBot,
    closeConversation,
  }
}

// --- type guard ---

interface IncomingMessagePayload {
  conversationId: string
  text: string | null
  createdAt: string | null
}

function isIncomingMessagePayload(
  data: unknown
): data is IncomingMessagePayload {
  if (!isRecord(data)) return false
  if (typeof data['conversationId'] !== 'string') return false
  return true
}
