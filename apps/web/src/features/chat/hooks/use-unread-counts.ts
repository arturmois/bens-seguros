'use client'

import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@repo/shared'

import { chatApi } from '../lib/chat-api'
import { isRecord } from '../lib/type-guards'

const UNREAD_KEY = 'chat-unread-counts'

export function useUnreadCounts(socket: Socket | null) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: [UNREAD_KEY],
    queryFn: async (): Promise<Record<string, number>> => {
      const response = await chatApi.get<Record<string, number>>(
        '/chat/conversations/unread-counts'
      )
      return response.data
    },
    staleTime: 60_000,
  })
  const handleUnreadUpdate = useCallback(
    (payload: unknown) => {
      if (!isRecord(payload)) return
      void queryClient.invalidateQueries({ queryKey: [UNREAD_KEY] })
    },
    [queryClient]
  )
  useEffect(() => {
    if (!socket) return
    socket.on(SOCKET_EVENTS.UNREAD_UPDATE, handleUnreadUpdate)
    return () => {
      socket.off(SOCKET_EVENTS.UNREAD_UPDATE, handleUnreadUpdate)
    }
  }, [socket, handleUnreadUpdate])
  return { unreadCounts: query.data ?? {} }
}
