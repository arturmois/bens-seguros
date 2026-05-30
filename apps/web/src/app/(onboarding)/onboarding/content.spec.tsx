// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
const searchParamsGetMock = vi.fn<(key: string) => string | null>(() => null)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
}))

vi.mock('@/features/org/hooks/use-orgs', () => ({
  useOrgs: vi.fn(),
}))

vi.mock('@/features/billing/components/onboarding-org-form', () => ({
  OnboardingOrgForm: ({ planSlug }: { readonly planSlug: string }) => (
    <div data-testid="onboarding-org-form">{planSlug}</div>
  ),
}))

vi.mock('@/features/org/components/create-org-form', () => ({
  CreateOrgForm: () => <div data-testid="create-org-form" />,
}))

import { useOrgs } from '@/features/org/hooks/use-orgs'

import { OnboardingContent } from './content'

const mockUseOrgs = vi.mocked(useOrgs)

function mockOrgs(overrides: Partial<ReturnType<typeof useOrgs>> = {}) {
  mockUseOrgs.mockReturnValue({
    orgs: [],
    isLoading: false,
    switchOrg: vi.fn(),
    activeOrg: null,
    ...overrides,
  } as unknown as ReturnType<typeof useOrgs>)
}

function withParams(params: Record<string, string>) {
  searchParamsGetMock.mockImplementation((key) => params[key] ?? null)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  searchParamsGetMock.mockImplementation(() => null)
})

const existingOrg = { id: 'org_1' } as unknown as ReturnType<
  typeof useOrgs
>['orgs'][number]

describe('OnboardingContent', () => {
  it('redirects brand-new users with no plan to /select-plan', () => {
    mockOrgs({ orgs: [] })
    render(<OnboardingContent />)
    expect(replaceMock).toHaveBeenCalledWith('/select-plan')
    expect(screen.queryByTestId('onboarding-org-form')).toBeNull()
    expect(screen.queryByTestId('create-org-form')).toBeNull()
  })

  it('renders the onboarding org form when a plan is selected', () => {
    mockOrgs({ orgs: [] })
    withParams({ plan: 'starter' })
    render(<OnboardingContent />)
    expect(screen.getByTestId('onboarding-org-form').textContent).toBe(
      'starter'
    )
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('renders CreateOrgForm for the multi-org add flow (new=true, no plan)', () => {
    mockOrgs({ orgs: [existingOrg] })
    withParams({ new: 'true' })
    render(<OnboardingContent />)
    expect(screen.getByTestId('create-org-form')).toBeTruthy()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('never shows CreateOrgForm to a brand-new user even with new=true', () => {
    mockOrgs({ orgs: [] })
    withParams({ new: 'true' })
    render(<OnboardingContent />)
    expect(screen.queryByTestId('create-org-form')).toBeNull()
    expect(replaceMock).toHaveBeenCalledWith('/select-plan')
  })

  it('redirects existing users with no add intent to /', () => {
    mockOrgs({ orgs: [existingOrg] })
    render(<OnboardingContent />)
    expect(replaceMock).toHaveBeenCalledWith('/')
    expect(screen.queryByTestId('create-org-form')).toBeNull()
  })

  it('renders nothing while orgs are loading', () => {
    mockOrgs({ isLoading: true })
    render(<OnboardingContent />)
    expect(screen.queryByTestId('onboarding-org-form')).toBeNull()
    expect(screen.queryByTestId('create-org-form')).toBeNull()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
