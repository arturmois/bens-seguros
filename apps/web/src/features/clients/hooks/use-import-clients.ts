'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'

import type {
  ImportPreviewResponse,
  ImportStatusResponse,
} from '../types/import-types'

const CLIENTS_KEY = 'clients'

export function useUploadCsv() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<ImportPreviewResponse>(
        '/api/v1/clients/import',
        formData
      )
      return response.data
    },
    onError: () => {
      toast.error('Erro ao enviar arquivo CSV')
    },
  })
}

export function useConfirmImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post<{ jobId: string }>(
        '/api/v1/clients/import/confirm',
        { jobId }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
    onError: () => {
      toast.error('Erro ao confirmar importacao')
    },
  })
}

export function useImportStatus(jobId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['import-status', jobId],
    queryFn: async () => {
      const response = await api.get<ImportStatusResponse>(
        `/api/v1/clients/import/status/${jobId}`
      )
      return response.data
    },
    enabled: enabled && jobId.length > 0,
    refetchInterval: 2_000,
  })
}
