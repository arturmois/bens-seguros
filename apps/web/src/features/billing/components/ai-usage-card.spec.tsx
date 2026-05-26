// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/use-billing-ai-usage', () => ({
  useBillingAiUsage: vi.fn(),
}))

import { useBillingAiUsage } from '../hooks/use-billing-ai-usage'
import { AiUsageCard } from './ai-usage-card'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseBillingAiUsage = vi.mocked(useBillingAiUsage)

function mockReturn(overrides: Partial<ReturnType<typeof useBillingAiUsage>>) {
  mockUseBillingAiUsage.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useBillingAiUsage>)
}

function makeData(
  overrides: {
    readonly series?: ReadonlyArray<{
      readonly date: string
      readonly inputTokens: number
      readonly outputTokens: number
      readonly totalCostMicrocents: number
      readonly messageCount: number
    }>
    readonly totals?: {
      readonly inputTokens: number
      readonly outputTokens: number
      readonly totalCostMicrocents: number
      readonly messageCount: number
      readonly periodStart: string
      readonly periodEnd: string
    }
  } = {}
) {
  return {
    series: overrides.series ?? [
      {
        date: '2026-05-20',
        inputTokens: 100,
        outputTokens: 50,
        totalCostMicrocents: 12000,
        messageCount: 3,
      },
    ],
    totals: overrides.totals ?? {
      inputTokens: 100,
      outputTokens: 50,
      totalCostMicrocents: 12000,
      messageCount: 3,
      periodStart: '2026-04-26T00:00:00.000Z',
      periodEnd: '2026-05-26T00:00:00.000Z',
    },
  }
}

describe('AiUsageCard', () => {
  it('renders skeleton while loading', () => {
    mockReturn({ isLoading: true })
    const { container } = render(<AiUsageCard />)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy()
  })

  it('renders error with retry when isError', () => {
    const refetch = vi.fn()
    mockReturn({ isError: true, refetch })
    render(<AiUsageCard />)
    expect(screen.getByText(/Erro ao carregar uso de IA/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('renders empty state when totals.messageCount is zero', () => {
    mockReturn({
      data: makeData({
        series: [],
        totals: {
          inputTokens: 0,
          outputTokens: 0,
          totalCostMicrocents: 0,
          messageCount: 0,
          periodStart: '2026-04-26T00:00:00.000Z',
          periodEnd: '2026-05-26T00:00:00.000Z',
        },
      }) as never,
    })
    render(<AiUsageCard />)
    expect(screen.getByText(/Sem uso de IA neste período/i)).toBeTruthy()
  })

  it('renders metric tiles with totals when usage exists', () => {
    mockReturn({ data: makeData() as never })
    render(<AiUsageCard />)
    expect(screen.getByText('Mensagens')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Tokens (in + out)')).toBeTruthy()
    expect(screen.getByText('150')).toBeTruthy()
    expect(screen.getByText('Custo estimado')).toBeTruthy()
    expect(screen.getByText(/R\$\s?1,20/)).toBeTruthy()
  })

  it('renders chart container when usage exists', () => {
    mockReturn({ data: makeData() as never })
    const { container } = render(<AiUsageCard />)
    expect(container.querySelector('[data-slot="ai-usage-chart"]')).toBeTruthy()
  })

  it('exposes range buttons with default 30 days selected', () => {
    mockReturn({ data: makeData() as never })
    render(<AiUsageCard />)
    const btn30 = screen.getByRole('button', { name: /30 dias/i })
    expect(btn30.getAttribute('aria-pressed')).toBe('true')
    const btn7 = screen.getByRole('button', { name: /7 dias/i })
    expect(btn7.getAttribute('aria-pressed')).toBe('false')
  })

  it('switches range and re-queries when 7 dias clicked', () => {
    mockReturn({ data: makeData() as never })
    render(<AiUsageCard />)
    fireEvent.click(screen.getByRole('button', { name: /7 dias/i }))
    expect(mockUseBillingAiUsage).toHaveBeenLastCalledWith({ days: 7 })
  })
})
