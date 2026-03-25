'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useCallback } from 'react'
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
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post<{ jobId: string }>(
        `/api/v1/clients/import/${jobId}/confirm`,
        {}
      )
      return response.data
    },
    onError: () => {
      toast.error('Erro ao confirmar importacao')
    },
  })
}

export function useImportStatus(jobId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const didInvalidate = useRef(false)

  const handleCompleted = useCallback(() => {
    if (didInvalidate.current) return
    didInvalidate.current = true
    queryClient.invalidateQueries({ queryKey: [CLIENTS_KEY] })
  }, [queryClient])

  return useQuery({
    queryKey: ['import-status', jobId],
    queryFn: async () => {
      const response = await api.get<ImportStatusResponse>(
        `/api/v1/clients/import/${jobId}/status`
      )
      const data = response.data
      if (data.status === 'completed') {
        handleCompleted()
      }
      return data
    },
    enabled: enabled && jobId.length > 0,
    refetchInterval: 2_000,
  })
}
