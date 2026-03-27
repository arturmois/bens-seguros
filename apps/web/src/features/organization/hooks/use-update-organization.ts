'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'

import type { OrganizationData } from '../types'
import { ORGANIZATION_KEY } from './use-organization'

const ORGS_KEY = ['orgs'] as const

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; slug: string }) => {
      const response = await api.put<OrganizationData>(
        '/api/v1/organization',
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY })
      queryClient.invalidateQueries({ queryKey: ORGS_KEY })
      toast.success('Organização atualizada com sucesso')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'SLUG_CONFLICT') {
        toast.error('Este slug já está em uso por outra organização')
        return
      }
      toast.error('Erro ao atualizar organização')
    },
  })
}
