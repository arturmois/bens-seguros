'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  useListDocuments,
  useGetDocumentUrl,
  deleteDocument,
  getListDocumentsQueryKey,
} from '@/api/endpoints/documents/documents'

import type {
  DocumentData,
  DocumentEntityType,
  DocumentType,
} from '../lib/constants'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export function useDocuments(entityType: DocumentEntityType, entityId: string) {
  return useListDocuments(
    { entityType, entityId },
    {
      query: {
        enabled: entityId.length > 0,
        select: (response) => response.data.data,
      },
    }
  )
}

interface UploadInput {
  readonly entityType: DocumentEntityType
  readonly entityId: string
  readonly file: File
  readonly type?: DocumentType
}

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
  return useGetDocumentUrl(id, {
    query: {
      enabled: id.length > 0,
      select: (response) => response.data.data,
    },
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
