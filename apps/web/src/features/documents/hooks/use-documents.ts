'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api } from '@/lib/api-client'
import {
  getListDocumentsQueryKey,
  getGetDocumentUrlQueryKey,
  deleteDocument,
} from '@/api/endpoints/documents/documents'

import type { DocumentData, DocumentEntityType, DocumentType } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function useDocuments(entityType: DocumentEntityType, entityId: string) {
  return useQuery({
    queryKey: getListDocumentsQueryKey({ entityType, entityId }),
    queryFn: async () => {
      const params = new URLSearchParams({ entityType, entityId })
      const response = await api.get<DocumentData[]>(
        `/api/v1/documents?${params.toString()}`
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: entityId.length > 0,
  })
}

interface UploadInput {
  readonly entityType: DocumentEntityType
  readonly entityId: string
  readonly file: File
  readonly type?: DocumentType
}

/**
 * Upload stays manual because Orval does not handle multipart FormData uploads.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ entityType, entityId, file, type }: UploadInput) => {
      const formData = new FormData()
      formData.append('file', file)

      const params = new URLSearchParams({ entityType, entityId })
      if (type) params.set('type', type)

      const res = await fetch(
        `${API_URL}/api/v1/documents/upload?${params.toString()}`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      )

      if (res.status === 201) {
        const body = (await res.json()) as { success: true; data: DocumentData }
        return body.data
      }

      const errorBody = (await res.json()) as {
        success: false
        error: { code: string; message: string }
      }
      throw new Error(errorBody.error.message)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: getListDocumentsQueryKey({
          entityType: variables.entityType,
          entityId: variables.entityId,
        }),
      })
      toast.success('Documento enviado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao enviar documento')
    },
  })
}

export function useDocumentUrl(id: string) {
  return useQuery({
    queryKey: getGetDocumentUrlQueryKey(id),
    queryFn: async () => {
      const response = await api.get<{ url: string }>(
        `/api/v1/documents/${id}/url`
      )
      return response.data
    },
    staleTime: 60_000,
    enabled: id.length > 0,
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDocument(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getListDocumentsQueryKey(),
      })
      toast.success('Documento excluído com sucesso')
    },
    onError: () => {
      toast.error('Erro ao excluir documento')
    },
  })
}
