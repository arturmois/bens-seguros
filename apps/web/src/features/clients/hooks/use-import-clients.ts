'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useCallback } from 'react'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'
import {
  getListClientsQueryKey,
  getImportStatusClientsQueryKey,
  getImportUploadClientsUrl,
  getImportConfirmClientsUrl,
  getImportStatusClientsUrl,
} from '@/api/endpoints/clients/clients'

import type {
  ImportPreviewResponse,
  ImportStatusResponse,
} from '../types/import-types'

export function useUploadCsv() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post<ImportPreviewResponse>(
        getImportUploadClientsUrl(),
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
        getImportConfirmClientsUrl(jobId),
        {}
      )
      return response.data
    },
    onError: () => {
      toast.error('Erro ao confirmar importação')
    },
  })
}

export function useImportStatus(jobId: string, enabled: boolean) {
  const queryClient = useQueryClient()
  const didInvalidate = useRef(false)
  const handleCompleted = useCallback(() => {
    if (didInvalidate.current) return
    didInvalidate.current = true
    queryClient.invalidateQueries({
      queryKey: getListClientsQueryKey(),
    })
  }, [queryClient])
  return useQuery({
    queryKey: getImportStatusClientsQueryKey(jobId),
    queryFn: async () => {
      const response = await api.get<ImportStatusResponse>(
        getImportStatusClientsUrl(jobId)
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
