// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/use-billing-invoices', () => ({
  useBillingInvoices: vi.fn(),
}))

import { useBillingInvoices } from '../hooks/use-billing-invoices'
import { InvoicesList } from './invoices-list'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseBillingInvoices = vi.mocked(useBillingInvoices)

function mockReturn(overrides: Partial<ReturnType<typeof useBillingInvoices>>) {
  mockUseBillingInvoices.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useBillingInvoices>)
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv_1',
    status: 'PAID' as const,
    amountCents: 1990,
    baseAmountCents: 1990,
    overageAmountCents: 0,
    dueDate: '2026-05-01T00:00:00.000Z',
    paidAt: '2026-04-30T10:00:00.000Z',
    periodStart: '2026-04-01T00:00:00.000Z',
    periodEnd: '2026-04-30T23:59:59.000Z',
    paymentMethod: 'PIX' as const,
    invoiceUrl: null,
    receiptUrl: null,
    createdAt: '2026-04-30T10:00:01.000Z',
    ...overrides,
  }
}

describe('InvoicesList', () => {
  it('renders skeleton while loading', () => {
    mockReturn({ isLoading: true })
    const { container } = render(<InvoicesList />)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy()
  })

  it('renders error with retry when isError', () => {
    const refetch = vi.fn()
    mockReturn({ isError: true, refetch })
    render(<InvoicesList />)
    expect(screen.getByText(/Erro ao carregar faturas/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders empty state when no invoices and no pagination history', () => {
    mockReturn({
      data: { items: [], nextCursor: null } as never,
    })
    render(<InvoicesList />)
    expect(screen.getByText(/Nenhuma fatura ainda/i)).toBeTruthy()
  })

  it('renders invoice rows with status badge, period, value', () => {
    mockReturn({
      data: { items: [makeInvoice()], nextCursor: null } as never,
    })
    render(<InvoicesList />)
    expect(screen.getByText('Pago')).toBeTruthy()
    expect(screen.getByText(/R\$\s?19,90/)).toBeTruthy()
  })

  it('renders next button disabled when nextCursor is null', () => {
    mockReturn({
      data: { items: [makeInvoice()], nextCursor: null } as never,
    })
    render(<InvoicesList />)
    const nextBtn = screen.getByRole('button', { name: /Próxima página/i })
    expect(nextBtn.getAttribute('disabled')).not.toBeNull()
  })

  it('shows "Abrir" link when invoiceUrl is present', () => {
    mockReturn({
      data: {
        items: [makeInvoice({ invoiceUrl: 'https://example.com/inv/1' })],
        nextCursor: null,
      } as never,
    })
    render(<InvoicesList />)
    const link = screen.getByRole('link', { name: /Abrir/i })
    expect(link.getAttribute('href')).toBe('https://example.com/inv/1')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
