// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('../hooks/use-billing-plans', () => ({
  useBillingPlans: vi.fn(),
}))

import type { ListBillingPlans200DataItem } from '@/api/model'

import { useBillingPlans } from '../hooks/use-billing-plans'
import { PlanSelector } from './plan-selector'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseBillingPlans = vi.mocked(useBillingPlans)

function mockReturn(overrides: Partial<ReturnType<typeof useBillingPlans>>) {
  mockUseBillingPlans.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useBillingPlans>)
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

describe('PlanSelector', () => {
  it('renders skeleton while loading', () => {
    mockReturn({ isLoading: true })
    const { container } = render(<PlanSelector />)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy()
  })

  it('renders error with retry when isError', () => {
    const refetch = vi.fn()
    mockReturn({ isError: true, refetch })
    render(<PlanSelector />)
    expect(
      screen.getByText(/Não foi possível carregar os planos/i)
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders empty state when there are no plans', () => {
    mockReturn({ data: [] })
    render(<PlanSelector />)
    expect(screen.getByText(/Nenhum plano disponível/i)).toBeTruthy()
  })

  it('renders a card per plan with name and free-tier price', () => {
    mockReturn({
      data: [
        makePlan({ id: 'p_free', slug: 'free', name: 'Free', priceCents: 0 }),
        makePlan(),
      ],
    })
    render(<PlanSelector />)
    expect(screen.getByText('Free')).toBeTruthy()
    expect(screen.getByText('Starter')).toBeTruthy()
    expect(screen.getByText('Grátis')).toBeTruthy()
  })

  it('disables Continuar until a plan is selected', () => {
    mockReturn({ data: [makePlan()] })
    render(<PlanSelector />)
    const continueButton = screen.getByRole('button', { name: /Continuar/i })
    expect(continueButton.getAttribute('disabled')).not.toBeNull()
  })

  it('navigates to /onboarding with the selected plan slug on Continuar', () => {
    mockReturn({ data: [makePlan({ slug: 'starter', name: 'Starter' })] })
    render(<PlanSelector />)
    fireEvent.click(screen.getByRole('radio', { name: /Starter/i }))
    const continueButton = screen.getByRole('button', { name: /Continuar/i })
    expect(continueButton.getAttribute('disabled')).toBeNull()
    fireEvent.click(continueButton)
    expect(pushMock).toHaveBeenCalledWith('/onboarding?plan=starter')
  })
})
