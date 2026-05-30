// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/api-client'

const pushMock = vi.fn()
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))

const invalidateQueriesMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))

const setActiveMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/auth-client', () => ({
  authClient: {
    organization: { setActive: (...args: unknown[]) => setActiveMock(...args) },
  },
}))

const setActiveOrgCookieMock = vi.fn()
vi.mock('@/lib/org-cookie', () => ({
  setActiveOrgCookie: (...args: unknown[]) => setActiveOrgCookieMock(...args),
}))

const toastErrorMock = vi.fn()
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args) },
}))

const useCompleteOnboardingMutationMock = vi.fn()
vi.mock('@/api/endpoints/onboarding/onboarding', () => ({
  useCompleteOnboarding: (options: unknown) =>
    useCompleteOnboardingMutationMock(options),
}))

import { useCompleteOnboarding } from './use-complete-onboarding'

interface OnboardingSuccess {
  status: number
  data: { data: { organizationId: string; redirectTo: '/dashboard' } }
}

interface CapturedMutation {
  onSuccess: (result: OnboardingSuccess) => Promise<void> | void
  onError: (error: unknown) => void
}

function captureMutation(): CapturedMutation {
  renderHook(() => useCompleteOnboarding())
  const options = useCompleteOnboardingMutationMock.mock.calls[0]?.[0] as {
    mutation: CapturedMutation
  }
  return options.mutation
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useCompleteOnboarding', () => {
  it('sets active org, cookie, invalidates auth + orgs, and navigates to redirectTo on success', async () => {
    const { onSuccess } = captureMutation()

    await onSuccess({
      status: 200,
      data: { data: { organizationId: 'org_1', redirectTo: '/dashboard' } },
    })

    expect(setActiveMock).toHaveBeenCalledWith({ organizationId: 'org_1' })
    expect(setActiveOrgCookieMock).toHaveBeenCalledWith('org_1')
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['auth'] })
    expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ['orgs'] })
    expect(pushMock).toHaveBeenCalledWith('/dashboard')
  })

  it('redirects to /select-plan and toasts when the plan is not found', () => {
    const { onError } = captureMutation()

    onError(new ApiError(404, 'PLAN_NOT_FOUND', 'Plano "x" não encontrado'))

    expect(replaceMock).toHaveBeenCalledWith('/select-plan')
    expect(toastErrorMock).toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('toasts the error message without redirecting on other errors', () => {
    const { onError } = captureMutation()

    onError(
      new ApiError(503, 'BILLING_PROVIDER_UNAVAILABLE', 'Serviço indisponível.')
    )

    expect(toastErrorMock).toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
