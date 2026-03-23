'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { chatApi } from '@/features/chat/lib/chat-api'

import type {
  AiAgentConfig,
  ChannelData,
  CreateChannelPayload,
  UpdateAiAgentPayload,
  UpdateChannelPayload,
} from '../types'

const CHANNELS_KEY = 'channels'
const AI_AGENT_KEY = 'ai-agent'

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
    onError: () => {
      toast.error('Erro ao criar canal')
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
    onError: () => {
      toast.error('Erro ao atualizar canal')
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

export function useAiAgentConfig(channelId: string | null) {
  return useQuery({
    queryKey: [AI_AGENT_KEY, channelId],
    queryFn: async () => {
      const response = await chatApi.get<AiAgentConfig>(
        `/chat/channels/${channelId}/ai-agent`
      )
      return response.data
    },
    enabled: channelId !== null,
    staleTime: 60_000,
  })
}

export function useUpdateAiAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      channelId,
      data,
    }: {
      channelId: string
      data: UpdateAiAgentPayload
    }) => {
      const response = await chatApi.put<AiAgentConfig>(
        `/chat/channels/${channelId}/ai-agent`,
        data
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [AI_AGENT_KEY, variables.channelId],
      })
      toast.success('Configuracao de IA salva')
    },
    onError: () => {
      toast.error('Erro ao salvar configuracao de IA')
    },
  })
}
