'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getGetGoalsProgressQueryKey,
  useUpsertGoalsByYear,
} from '@/api/endpoints/goals/goals'

interface UseUpsertGoalsArgs {
  readonly year: number
  readonly onSuccess?: () => void
}

export function useUpsertGoals({ year, onSuccess }: UseUpsertGoalsArgs) {
  const queryClient = useQueryClient()
  return useUpsertGoalsByYear({
    mutation: {
      onSuccess: () => {
        toast.success('Metas salvas com sucesso')
        void queryClient.invalidateQueries({
          queryKey: getGetGoalsProgressQueryKey({ year }),
        })
        onSuccess?.()
      },
      onError: () => {
        toast.error('Erro ao salvar metas. Tente novamente.')
      },
    },
  })
}
