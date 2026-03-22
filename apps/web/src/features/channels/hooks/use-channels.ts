'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { chatApi } from '@/features/chat/lib/chat-api';

import type { ChannelData, CreateChannelPayload, UpdateChannelPayload } from '../types';

const CHANNELS_KEY = 'channels';

export function useChannels() {
  return useQuery({
    queryKey: [CHANNELS_KEY],
    queryFn: async () => {
      const response = await chatApi.get<ChannelData[]>('/chat/channels');
      return response.data;
    },
    staleTime: 60_000,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateChannelPayload) => {
      const response = await chatApi.post<ChannelData>('/chat/channels', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] });
      toast.success('Canal criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar canal');
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateChannelPayload }) => {
      const response = await chatApi.put<ChannelData>(`/chat/channels/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] });
      toast.success('Canal atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar canal');
    },
  });
}

export function useDeactivateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await chatApi.delete<ChannelData>(`/chat/channels/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] });
      toast.success('Canal desativado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao desativar canal');
    },
  });
}
