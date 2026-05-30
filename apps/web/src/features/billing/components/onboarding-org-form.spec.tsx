// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

vi.mock('../hooks/use-billing-plans', () => ({
  useBillingPlans: vi.fn(),
}))

const mutateMock = vi.fn()
vi.mock('../hooks/use-complete-onboarding', () => ({
  useCompleteOnboarding: vi.fn(() => ({
    mutate: mutateMock,
    isPending: false,
  })),
}))

import type { ListBillingPlans200DataItem } from '@/api/model'

import { useBillingPlans } from '../hooks/use-billing-plans'
import { useCompleteOnboarding } from '../hooks/use-complete-onboarding'
import { OnboardingOrgForm } from './onboarding-org-form'

const mockUseBillingPlans = vi.mocked(useBillingPlans)
const mockUseCompleteOnboarding = vi.mocked(useCompleteOnboarding)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function mockPlans(overrides: Partial<ReturnType<typeof useBillingPlans>>) {
  mockUseBillingPlans.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof useBillingPlans>)
}

function mockMutation(isPending = false) {
  mockUseCompleteOnboarding.mockReturnValue({
    mutate: mutateMock,
    isPending,
  } as unknown as ReturnType<typeof useCompleteOnboarding>)
}

function makePlan(
  overrides: Partial<ListBillingPlans200DataItem> = {}
): ListBillingPlans200DataItem {
  return {
    id: 'plan_starter',
    slug: 'starter',
    name: 'Starter',
    description: 'Para corretoras pequenas',
    priceCents: 29900,
    currency: 'BRL',
    billingPeriod: 'MONTHLY',
    sortOrder: 1,
    maxUsers: 3,
    maxProposalsPerMonth: 100,
    maxChannels: 3,
    maxConversationsPerOrg: 100,
    maxImportRows: 500,
    maxLogoSizeBytes: 512 * 1024,
    aiEnabled: true,
    aiMessagesIncluded: 200,
    aiOverageCentsPerMessage: 30,
    features: {},
    ...overrides,
  }
}

describe('OnboardingOrgForm', () => {
  it('renders the org name field and submit button', () => {
    mockPlans({ data: [makePlan()] })
    mockMutation()
    render(<OnboardingOrgForm planSlug="starter" />)
    expect(screen.getByLabelText(/Nome da corretora/i)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Criar corretora/i })
    ).toBeTruthy()
  })

  it('shows the selected plan summary with name and price', () => {
    mockPlans({ data: [makePlan({ slug: 'starter', name: 'Starter' })] })
    mockMutation()
    render(<OnboardingOrgForm planSlug="starter" />)
    expect(screen.getByText('Starter')).toBeTruthy()
    expect(screen.getByText(/14 dias grátis/i)).toBeTruthy()
  })

  it('shows the free-tier label for a zero-price plan', () => {
    mockPlans({
      data: [makePlan({ slug: 'free', name: 'Free', priceCents: 0 })],
    })
    mockMutation()
    render(<OnboardingOrgForm planSlug="free" />)
    expect(screen.getByText('Grátis')).toBeTruthy()
  })

  it('offers a link back to /select-plan to change the plan', () => {
    mockPlans({ data: [makePlan()] })
    mockMutation()
    render(<OnboardingOrgForm planSlug="starter" />)
    const link = screen.getByRole('link', { name: /Trocar plano/i })
    expect(link.getAttribute('href')).toBe('/select-plan')
  })

  it('blocks submit and shows an error when the org name is empty', async () => {
    mockPlans({ data: [makePlan()] })
    mockMutation()
    render(<OnboardingOrgForm planSlug="starter" />)
    fireEvent.click(screen.getByRole('button', { name: /Criar corretora/i }))
    await waitFor(() => {
      expect(screen.getByText(/no mínimo 2 caracteres/i)).toBeTruthy()
    })
    expect(
      screen.getByLabelText(/Nome da corretora/i).getAttribute('aria-invalid')
    ).toBe('true')
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('calls mutate with the org name and plan slug on valid submit', async () => {
    mockPlans({ data: [makePlan({ slug: 'starter' })] })
    mockMutation()
    render(<OnboardingOrgForm planSlug="starter" />)
    fireEvent.change(screen.getByLabelText(/Nome da corretora/i), {
      target: { value: 'Corretora ABC' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar corretora/i }))
    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith({
        data: { orgName: 'Corretora ABC', planSlug: 'starter' },
      })
    })
  })

  it('redirects to /select-plan when the plan slug is not in the catalog', async () => {
    mockPlans({ data: [makePlan({ slug: 'starter' })] })
    mockMutation()
    render(<OnboardingOrgForm planSlug="ghost" />)
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/select-plan')
    })
  })

  it('disables submit and shows loading label while pending', () => {
    mockPlans({ data: [makePlan()] })
    mockMutation(true)
    render(<OnboardingOrgForm planSlug="starter" />)
    const button = screen.getByRole('button', { name: /Criando/i })
    expect(button.getAttribute('disabled')).not.toBeNull()
  })
})
