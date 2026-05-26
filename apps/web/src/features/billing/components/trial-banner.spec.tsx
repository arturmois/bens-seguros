// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('../hooks/use-billing-current', () => ({
  useBillingCurrent: vi.fn(),
}))

import { useBillingCurrent } from '../hooks/use-billing-current'
import { TrialBanner } from './trial-banner'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-05-25T00:00:00.000Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseBillingCurrent = vi.mocked(useBillingCurrent)

function withSubscription(
  subscription: {
    status: string
    billingManagedExternally: boolean
    trialEndsAt: string | null
  } | null
) {
  mockUseBillingCurrent.mockReturnValue({
    data: subscription === null ? null : ({ subscription } as never),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useBillingCurrent>)
}

describe('TrialBanner', () => {
  it('renders nothing when subscription is null', () => {
    withSubscription(null)
    const { container } = render(<TrialBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when status is not TRIALING', () => {
    withSubscription({
      status: 'ACTIVE',
      billingManagedExternally: false,
      trialEndsAt: null,
    })
    const { container } = render(<TrialBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when BILLED_EXTERNALLY (even if status TRIALING)', () => {
    withSubscription({
      status: 'TRIALING',
      billingManagedExternally: true,
      trialEndsAt: '2026-06-01T00:00:00.000Z',
    })
    const { container } = render(<TrialBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders banner with days remaining when status TRIALING + trialEndsAt future', () => {
    withSubscription({
      status: 'TRIALING',
      billingManagedExternally: false,
      trialEndsAt: '2026-05-30T00:00:00.000Z',
    })
    render(<TrialBanner />)
    expect(screen.getByText(/Avaliação termina em 5 dias/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ver planos/i })).toBeTruthy()
  })

  it('uses singular "dia" when 1 day remaining', () => {
    withSubscription({
      status: 'TRIALING',
      billingManagedExternally: false,
      trialEndsAt: '2026-05-26T00:00:00.000Z',
    })
    render(<TrialBanner />)
    expect(screen.getByText(/Avaliação termina em 1 dia$/i)).toBeTruthy()
  })

  it('shows 0 days when trial already passed', () => {
    withSubscription({
      status: 'TRIALING',
      billingManagedExternally: false,
      trialEndsAt: '2026-05-20T00:00:00.000Z',
    })
    render(<TrialBanner />)
    expect(screen.getByText(/Avaliação termina em 0 dias/i)).toBeTruthy()
  })
})
