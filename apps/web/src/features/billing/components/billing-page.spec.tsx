// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/use-billing-current', () => ({
  useBillingCurrent: vi.fn(),
}))

vi.mock('./invoices-list', () => ({
  InvoicesList: () => null,
}))

import { useBillingCurrent } from '../hooks/use-billing-current'
import { BillingPage } from './billing-page'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseBillingCurrent = vi.mocked(useBillingCurrent)

function mockReturn(overrides: Partial<ReturnType<typeof useBillingCurrent>>) {
  mockUseBillingCurrent.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useBillingCurrent>)
}

describe('BillingPage', () => {
  it('renders skeleton during loading', () => {
    mockReturn({ isLoading: true })
    const { container } = render(<BillingPage />)
    const skeleton = container.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toBeTruthy()
  })

  it('renders error state with retry button when isError', () => {
    const refetch = vi.fn()
    mockReturn({ isError: true, refetch })
    render(<BillingPage />)
    expect(screen.getByText(/Erro ao carregar/i)).toBeTruthy()
    const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i })
    retryBtn.click()
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders "Plano comercial" card when billingManagedExternally is true', () => {
    mockReturn({
      data: {
        subscription: {
          id: 'sub_1',
          status: 'BILLED_EXTERNALLY',
          billingManagedExternally: true,
          trialEndsAt: null,
          currentPeriodEnd: null,
          plan: {
            slug: 'business',
            maxUsers: null,
            maxProposalsPerMonth: null,
            maxChannels: null,
            maxConversationsPerOrg: null,
            maxImportRows: null,
            maxLogoSizeBytes: null,
            aiEnabled: true,
            aiMessagesIncluded: 0,
            aiOverageCentsPerMessage: 0,
          },
        },
        entitlements: {} as never,
      } as never,
    })
    render(<BillingPage />)
    expect(screen.getByText('Plano comercial')).toBeTruthy()
    expect(
      screen.getByText(/gerenciada externamente por contrato comercial/i)
    ).toBeTruthy()
  })

  it('renders active subscription card with plan label + status badge', () => {
    mockReturn({
      data: {
        subscription: {
          id: 'sub_2',
          status: 'ACTIVE',
          billingManagedExternally: false,
          trialEndsAt: null,
          currentPeriodEnd: '2026-12-01T00:00:00.000Z',
          plan: {
            slug: 'pro',
            maxUsers: 10,
            maxProposalsPerMonth: 100,
            maxChannels: 5,
            maxConversationsPerOrg: 1000,
            maxImportRows: 1000,
            maxLogoSizeBytes: 5242880,
            aiEnabled: true,
            aiMessagesIncluded: 500,
            aiOverageCentsPerMessage: 10,
          },
        },
        entitlements: {} as never,
      } as never,
    })
    render(<BillingPage />)
    expect(screen.getByText('Profissional')).toBeTruthy()
    expect(screen.getByText('Ativo')).toBeTruthy()
    expect(screen.getByText(/Próxima renovação/i)).toBeTruthy()
  })

  it('renders empty state when subscription is null', () => {
    mockReturn({
      data: { subscription: null, entitlements: {} as never } as never,
    })
    render(<BillingPage />)
    expect(screen.getByText('Nenhum plano ativo')).toBeTruthy()
  })
})
