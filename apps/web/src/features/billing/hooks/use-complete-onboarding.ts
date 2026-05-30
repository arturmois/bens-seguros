'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useCompleteOnboarding as useCompleteOnboardingMutation } from '@/api/endpoints/onboarding/onboarding'
import { ApiError } from '@/lib/api-client'
import { authClient } from '@/lib/auth-client'
import { extractErrorMessage } from '@/lib/extract-error-message'
import { setActiveOrgCookie } from '@/lib/org-cookie'

export function useCompleteOnboarding() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useCompleteOnboardingMutation({
    mutation: {
      onSuccess: async (result) => {
        if (result.status !== 200) return
        const { organizationId, redirectTo } = result.data.data
        await authClient.organization.setActive({ organizationId })
        setActiveOrgCookie(organizationId)
        await queryClient.invalidateQueries({ queryKey: ['auth'] })
        await queryClient.invalidateQueries({ queryKey: ['orgs'] })
        router.push(redirectTo)
      },
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'PLAN_NOT_FOUND') {
          toast.error('Plano indisponível. Escolha outro plano.')
          router.replace('/select-plan')
          return
        }
        toast.error(extractErrorMessage(error, 'Erro ao criar corretora.'))
      },
    },
  })
}
