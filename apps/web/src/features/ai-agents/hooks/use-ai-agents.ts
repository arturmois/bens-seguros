'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { chatApi, ChatApiError } from '@/features/chat/lib/chat-api'

import type {
  AiAgentData,
  AiAgentDetail,
  AvailableTool,
  CreateAiAgentPayload,
  UpdateAiAgentPayload,
} from '../types'

const AI_AGENTS_KEY = 'ai-agents'

export function useAiAgents() {
  return useQuery({
    queryKey: [AI_AGENTS_KEY],
    queryFn: async () => {
      const response = await chatApi.get<AiAgentData[]>('/chat/ai-agents')
      return response.data
    },
    staleTime: 60_000,
  })
}

export function useAiAgent(id: string | null) {
  return useQuery({
    queryKey: [AI_AGENTS_KEY, id],
    queryFn: async () => {
      const response = await chatApi.get<AiAgentDetail>(`/chat/ai-agents/${id}`)
      return response.data
    },
    enabled: id !== null,
    staleTime: 60_000,
  })
}

const AVAILABLE_TOOLS_KEY = 'ai-agents-available-tools'

export function useAvailableTools() {
  return useQuery({
    queryKey: [AVAILABLE_TOOLS_KEY],
    queryFn: async () => {
      const response = await chatApi.get<AvailableTool[]>(
        '/chat/ai-agents/available-tools'
      )
      return response.data
    },
    staleTime: 300_000,
  })
}

export function useCreateAiAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateAiAgentPayload) => {
      const response = await chatApi.post<AiAgentData>(
        '/chat/ai-agents',
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AI_AGENTS_KEY] })
      toast.success('Agente criado com sucesso')
    },
    onError: (error) => {
      if (
        error instanceof ChatApiError &&
        error.code === 'AGENT_NAME_ALREADY_EXISTS'
      ) {
        toast.error('Ja existe um agente com este nome')
        return
      }
      toast.error('Erro ao criar agente')
    },
  })
}

export function useUpdateAiAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateAiAgentPayload
    }) => {
      const response = await chatApi.put<AiAgentData>(
        `/chat/ai-agents/${id}`,
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AI_AGENTS_KEY] })
      toast.success('Agente atualizado com sucesso')
    },
    onError: (error) => {
      if (
        error instanceof ChatApiError &&
        error.code === 'AGENT_NAME_ALREADY_EXISTS'
      ) {
        toast.error('Ja existe um agente com este nome')
        return
      }
      toast.error('Erro ao atualizar agente')
    },
  })
}

export function useDeleteAiAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await chatApi.delete(`/chat/ai-agents/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AI_AGENTS_KEY] })
      toast.success('Agente excluído com sucesso')
    },
    onError: () => {
      toast.error('Erro ao excluir agente')
    },
  })
}
