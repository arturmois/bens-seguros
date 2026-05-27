// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/use-cancel-billing-subscription', () => ({
  useCancelBillingSubscription: vi.fn(),
}))

import { useCancelBillingSubscription } from '../hooks/use-cancel-billing-subscription'
import { CancelSubscriptionDialog } from './cancel-subscription-dialog'

const mockUseCancelBillingSubscription = vi.mocked(useCancelBillingSubscription)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

type MutationReturn = ReturnType<typeof useCancelBillingSubscription>

function mockReturn(overrides: Partial<MutationReturn> = {}) {
  const base = {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
    isSuccess: false,
    ...overrides,
  } as unknown as MutationReturn
  mockUseCancelBillingSubscription.mockReturnValue(base)
  return base
}

describe('CancelSubscriptionDialog', () => {
  it('does not render dialog content when open is false', () => {
    mockReturn()
    render(
      <CancelSubscriptionDialog
        open={false}
        onClose={vi.fn()}
        currentPeriodEnd="2026-06-01T00:00:00.000Z"
      />
    )
    expect(screen.queryByText(/Cancelar assinatura\?/i)).toBeNull()
  })

  it('renders dialog with title and warning when open', () => {
    mockReturn()
    render(
      <CancelSubscriptionDialog
        open={true}
        onClose={vi.fn()}
        currentPeriodEnd="2026-06-01T00:00:00.000Z"
      />
    )
    expect(screen.getByText(/Cancelar assinatura\?/i)).toBeTruthy()
    expect(screen.getByText(/perderá acesso a recursos do plano/i)).toBeTruthy()
  })

  it('shows currentPeriodEnd formatted when provided', () => {
    mockReturn()
    render(
      <CancelSubscriptionDialog
        open={true}
        onClose={vi.fn()}
        currentPeriodEnd="2026-06-01T00:00:00.000Z"
      />
    )
    expect(screen.getByText(/permanecerá ativa até/i)).toBeTruthy()
  })

  it('hides currentPeriodEnd block when null', () => {
    mockReturn()
    render(
      <CancelSubscriptionDialog
        open={true}
        onClose={vi.fn()}
        currentPeriodEnd={null}
      />
    )
    expect(screen.queryByText(/permanecerá ativa até/i)).toBeNull()
  })

  it('calls onClose when Voltar clicked', () => {
    const onClose = vi.fn()
    mockReturn()
    render(
      <CancelSubscriptionDialog
        open={true}
        onClose={onClose}
        currentPeriodEnd={null}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Voltar/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls mutate when Confirmar cancelamento clicked', () => {
    const mutation = mockReturn()
    render(
      <CancelSubscriptionDialog
        open={true}
        onClose={vi.fn()}
        currentPeriodEnd="2026-06-01T00:00:00.000Z"
      />
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmar cancelamento/i })
    )
    expect(mutation.mutate).toHaveBeenCalled()
  })

  it('disables buttons and shows loading label when isPending', () => {
    mockReturn({ isPending: true })
    render(
      <CancelSubscriptionDialog
        open={true}
        onClose={vi.fn()}
        currentPeriodEnd={null}
      />
    )
    expect(screen.getByText(/Cancelando\.\.\./i)).toBeTruthy()
    const confirmBtn = screen.getByRole('button', { name: /Cancelando/i })
    expect(confirmBtn.getAttribute('disabled')).not.toBeNull()
    const voltarBtn = screen.getByRole('button', { name: /Voltar/i })
    expect(voltarBtn.getAttribute('disabled')).not.toBeNull()
  })
})
