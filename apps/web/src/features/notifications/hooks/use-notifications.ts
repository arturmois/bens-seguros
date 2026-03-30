'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import {
  getListNotificationsQueryKey,
  getGetUnreadCountQueryKey,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/endpoints/notifications/notifications'

import type { NotificationData } from '../types/index'

const NOTIFICATIONS_BASE_KEY = getListNotificationsQueryKey()

export function useNotifications(limit = 10) {
  return useQuery({
    queryKey: getListNotificationsQueryKey({ limit }),
    queryFn: async () => {
      const res = await api.get<NotificationData[]>(
        `/api/v1/notifications?limit=${limit}`
      )
      return {
        data: res.data,
        meta: res.meta,
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: getGetUnreadCountQueryKey(),
    queryFn: async () => {
      const res = await api.get<{ count: number }>(
        '/api/v1/notifications/unread-count'
      )
      return res.data.count
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
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
    },
  })
}
