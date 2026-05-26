// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/use-billing-current', () => ({
  useBillingCurrent: vi.fn(),
}))

import { useBillingCurrent } from '../hooks/use-billing-current'
import { DunningBanner } from './dunning-banner'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseBillingCurrent = vi.mocked(useBillingCurrent)

function withSubscription(
  subscription: { status: string; billingManagedExternally: boolean } | null
) {
  mockUseBillingCurrent.mockReturnValue({
    data: subscription === null ? null : ({ subscription } as never),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBillingCurrent>)
}

describe('DunningBanner', () => {
  it('renders nothing when subscription is null', () => {
    withSubscription(null)
    const { container } = render(<DunningBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when status is ACTIVE', () => {
    withSubscription({ status: 'ACTIVE', billingManagedExternally: false })
    const { container } = render(<DunningBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when BILLED_EXTERNALLY (even if PAST_DUE)', () => {
    withSubscription({ status: 'PAST_DUE', billingManagedExternally: true })
    const { container } = render(<DunningBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders error alert when status PAST_DUE', () => {
    withSubscription({ status: 'PAST_DUE', billingManagedExternally: false })
    render(<DunningBanner />)
    expect(screen.getByText('Pagamento atrasado')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Atualizar pagamento/i })
    ).toBeTruthy()
  })
})
