'use client'

import { api } from '@/lib/api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationData } from '../types/index'

export function useNotifications(limit = 10) {
  return useQuery({
    queryKey: ['notifications', limit],
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
    queryKey: ['notifications', 'unread-count'],
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
      await api.post(`/api/v1/notifications/${id}/read`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/notifications/read-all', {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
