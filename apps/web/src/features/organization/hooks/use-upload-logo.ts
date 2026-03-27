'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'

import type { OrganizationData } from '../types'
import { ORGANIZATION_KEY } from './use-organization'

const ORGS_KEY = ['orgs'] as const

export function useUploadLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.upload<OrganizationData>(
        '/api/v1/organization/logo',
        formData
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY })
      queryClient.invalidateQueries({ queryKey: ORGS_KEY })
      toast.success('Logo atualizado com sucesso')
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        toast.error('Erro ao enviar logo')
        return
      }

      if (error.code === 'FILE_TOO_LARGE') {
        toast.error('Arquivo excede o tamanho máximo de 2MB')
        return
      }

      if (error.code === 'INVALID_FILE_TYPE') {
        toast.error(
          'Tipo de arquivo inválido. Permitidos: JPEG, PNG, WebP, GIF'
        )
        return
      }

      toast.error('Erro ao enviar logo')
    },
  })
}
