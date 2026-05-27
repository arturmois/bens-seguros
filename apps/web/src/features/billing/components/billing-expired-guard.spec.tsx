// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GetBillingCurrent200DataSubscription } from '@/api/model'

vi.mock('../hooks/use-billing-current', () => ({
  useBillingCurrent: vi.fn(),
}))

const mockReplace = vi.fn()
const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockUsePathname(),
}))

import { useBillingCurrent } from '../hooks/use-billing-current'
import { BillingExpiredGuard } from './billing-expired-guard'

type SubscriptionStatus =
  NonNullable<GetBillingCurrent200DataSubscription>['status']
type GuardHookReturn = ReturnType<typeof useBillingCurrent>

const mockUseBillingCurrent = vi.mocked(useBillingCurrent)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function mockHookReturn(data: GuardHookReturn['data']) {
  mockUseBillingCurrent.mockReturnValue({ data } as GuardHookReturn)
}

function mockSubscription(
  status: SubscriptionStatus,
  overrides: { readonly billingManagedExternally?: boolean } = {}
) {
  mockHookReturn({
    subscription: {
      id: 's1',
      status,
      billingManagedExternally: overrides.billingManagedExternally ?? false,
      trialEndsAt: null,
      currentPeriodEnd: null,
    },
    entitlements: {},
  } as GuardHookReturn['data'])
}

describe('BillingExpiredGuard', () => {
  it('redirects to /billing/expired when EXPIRED on dashboard route', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockSubscription('EXPIRED')
    render(<BillingExpiredGuard />)
    expect(mockReplace).toHaveBeenCalledWith('/billing/expired')
  })

  it('does not redirect when status is ACTIVE', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockSubscription('ACTIVE')
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when status is TRIALING', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockSubscription('TRIALING')
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when status is BILLED_EXTERNALLY', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockSubscription('BILLED_EXTERNALLY', { billingManagedExternally: true })
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when already on /billing/expired', () => {
    mockUsePathname.mockReturnValue('/billing/expired')
    mockSubscription('EXPIRED')
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect from /settings paths so users can reactivate', () => {
    mockUsePathname.mockReturnValue('/settings')
    mockSubscription('EXPIRED')
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect from nested /settings/* paths', () => {
    mockUsePathname.mockReturnValue('/settings/billing/invoices')
    mockSubscription('EXPIRED')
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when billingManagedExternally is true', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockSubscription('EXPIRED', { billingManagedExternally: true })
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect while subscription data is undefined (loading)', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockHookReturn(undefined)
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not redirect when subscription is null', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockHookReturn({
      subscription: null,
      entitlements: {},
    } as GuardHookReturn['data'])
    render(<BillingExpiredGuard />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('renders nothing in the DOM', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    mockSubscription('ACTIVE')
    const { container } = render(<BillingExpiredGuard />)
    expect(container.innerHTML).toBe('')
  })
})
