'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { chatApi, ChatApiError } from '@/features/chat/lib/chat-api'

import type {
  ChannelData,
  CreateChannelPayload,
  UpdateChannelPayload,
} from '../types'

const CHANNELS_KEY = 'channels'

export function useChannels() {
  return useQuery({
    queryKey: [CHANNELS_KEY],
    queryFn: async () => {
      const response = await chatApi.get<ChannelData[]>('/chat/channels')
      return response.data
    },
    staleTime: 60_000,
  })
}

export function useCreateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateChannelPayload) => {
      const response = await chatApi.post<ChannelData>(
        '/chat/channels',
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] })
      toast.success('Canal criado com sucesso')
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ChatApiError ? error.message : 'Erro ao criar canal'
      toast.error(msg)
    },
  })
}

export function useUpdateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateChannelPayload
    }) => {
      const response = await chatApi.put<ChannelData>(
        `/chat/channels/${id}`,
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] })
      toast.success('Canal atualizado com sucesso')
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ChatApiError
          ? error.message
          : 'Erro ao atualizar canal'
      toast.error(msg)
    },
  })
}

export function useDeactivateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await chatApi.delete<ChannelData>(`/chat/channels/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] })
      toast.success('Canal desativado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao desativar canal')
    },
  })
}

interface ValidateMetaPayload {
  pageId: string
  token: string
  channelType: 'INSTAGRAM' | 'MESSENGER' | 'WHATSAPP_META'
  metaAppId?: string
  metaAppSecret?: string
}

interface ValidateMetaResult {
  name: string
  username?: string
}

export function useValidateMetaChannel() {
  return useMutation({
    mutationFn: async (payload: ValidateMetaPayload) => {
      const response = await chatApi.post<ValidateMetaResult>(
        '/chat/channels/validate-meta',
        payload
      )
      return response.data
    },
  })
}

export function useDisconnectMetaChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await chatApi.post<{ disconnected: boolean }>(
        '/meta/disconnect',
        { channelId }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] })
      toast.success('Canal desconectado com sucesso')
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ChatApiError
          ? error.message
          : 'Erro ao desconectar canal'
      toast.error(msg)
    },
  })
}
