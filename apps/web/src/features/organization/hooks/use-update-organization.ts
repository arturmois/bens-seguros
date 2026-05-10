'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api-client'
import { updateOrganization } from '@/api/endpoints/organization/organization'

import { ORGANIZATION_KEY } from './use-organization'

const ORGS_KEY = ['orgs'] as const

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; slug: string }) => {
      return updateOrganization(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY })
      queryClient.invalidateQueries({ queryKey: [...ORGS_KEY] })
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
