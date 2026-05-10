'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { getListClientsQueryKey } from '@/api/endpoints/clients/clients'
import { api } from '@/lib/api-client'
import { extractErrorMessage } from '@/lib/extract-error-message'

export function useLgpdDeleteClient() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (clientId: string) =>
      api.post(`/api/v1/clients/${clientId}/lgpd-delete`, {}),
    onSuccess: () => {
      toast.success('Dados do cliente anonimizados conforme LGPD')
      queryClient.invalidateQueries({
        queryKey: getListClientsQueryKey(),
      })
      router.push('/clients')
    },
    onError: (error) => {
      const message = extractErrorMessage(
        error,
        'Erro ao excluir dados do cliente'
      )
      toast.error(message)
    },
  })
}
