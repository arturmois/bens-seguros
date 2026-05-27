'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getGetBillingCurrentQueryKey,
  useCancelBillingSubscription as useCancelBillingSubscriptionMutation,
} from '@/api/endpoints/billing/billing'
import { extractErrorMessage } from '@/lib/extract-error-message'

export function useCancelBillingSubscription() {
  const queryClient = useQueryClient()
  return useCancelBillingSubscriptionMutation({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getGetBillingCurrentQueryKey(),
        })
        toast.success('Assinatura cancelada com sucesso.')
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error, 'Erro ao cancelar assinatura.'))
      },
    },
  })
}
