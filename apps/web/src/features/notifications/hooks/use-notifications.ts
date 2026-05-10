'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListNotifications as useListNotificationsOrval,
  useGetUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  getListNotificationsQueryKey,
  getGetUnreadCountQueryKey,
} from '@/api/endpoints/notifications/notifications'

const NOTIFICATIONS_BASE_KEY = getListNotificationsQueryKey()

export function useNotifications(limit = 10) {
  return useListNotificationsOrval(
    { limit },
    {
      query: {
        staleTime: 30_000,
        refetchInterval: 60_000,
        select: (response) => ({
          data: response.data.data,
          meta: response.data.meta,
        }),
      },
    }
  )
}

export function useUnreadCount() {
  return useGetUnreadCount({
    query: {
      staleTime: 60_000,
      refetchInterval: 60_000,
      select: (response) => response.data.data.count,
    },
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await markNotificationRead(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_BASE_KEY })
      queryClient.invalidateQueries({ queryKey: getGetUnreadCountQueryKey() })
    },
    onError: () => {
      toast.error('Erro ao marcar notificação como lida')
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await markAllNotificationsRead()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_BASE_KEY })
      queryClient.invalidateQueries({ queryKey: getGetUnreadCountQueryKey() })
    },
    onError: () => {
      toast.error('Erro ao marcar notificações como lidas')
    },
  })
}
