// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/goals/hooks/use-goals-progress', () => ({
  useGoalsProgress: vi.fn(),
}))

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

import { useGoalsProgress } from '@/features/goals/hooks/use-goals-progress'
import { GoalsProgressCard } from './goals-progress-card'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseGoalsProgress = vi.mocked(useGoalsProgress)

describe('GoalsProgressCard', () => {
  it('exibe Skeleton enquanto isLoading é true', () => {
    mockUseGoalsProgress.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGoalsProgress>)

    const { container } = render(<GoalsProgressCard />)
    const skeleton = container.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toBeTruthy()
  })

  it('exibe AlertTriangle e botão "Tentar novamente" no estado de erro', () => {
    const refetch = vi.fn()
    mockUseGoalsProgress.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useGoalsProgress>)

    render(<GoalsProgressCard />)

    expect(screen.getByText('Erro ao carregar metas comerciais.')).toBeTruthy()
    const retryButton = screen.getByRole('button', { name: 'Tentar novamente' })
    expect(retryButton).toBeTruthy()
  })

  it('exibe mensagem de empty state e link para /metas quando não há metas', () => {
    const emptyEntries = Array.from({ length: 24 }, (_, i) => ({
      month: (i % 12) + 1,
      boardType: i < 12 ? 'NEW_INSURANCE' : 'RENEWAL',
      targetPremiumCents: 0,
      realizedPremiumCents: 0,
    }))

    mockUseGoalsProgress.mockReturnValue({
      data: { year: new Date().getFullYear(), entries: emptyEntries },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGoalsProgress>)

    render(<GoalsProgressCard />)

    expect(screen.getByText(/Sem metas para/)).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Cadastrar metas' })
    expect(link.getAttribute('href')).toBe('/metas')
  })
})
