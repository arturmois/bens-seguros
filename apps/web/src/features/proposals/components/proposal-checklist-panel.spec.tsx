// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/use-checklist', () => ({
  useChecklist: vi.fn(),
  useCompleteChecklistItem: () => ({ mutate: vi.fn(), isPending: false }),
  useUncompleteChecklistItem: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { useChecklist } from '../hooks/use-checklist'
import { ProposalChecklistPanel } from './proposal-checklist-panel'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderPanel() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ProposalChecklistPanel proposalId="prop-1" />
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProposalChecklistPanel — Auto-atendido badge', () => {
  it('renders "Auto-atendido" badge when isCompleted && completedBy === null', () => {
    vi.mocked(useChecklist).mockReturnValue({
      data: {
        items: [
          {
            id: 'i-1',
            proposalId: 'prop-1',
            itemKey: 'driver_license',
            label: 'CNH do condutor',
            isRequired: false,
            isCompleted: true,
            completedBy: null,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        summary: {
          total: 1,
          completed: 1,
          required: 0,
          requiredCompleted: 0,
          canAdvance: true,
        },
      },
      isLoading: false,
      isError: false,
    } as never)
    renderPanel()
    expect(screen.getByText('Auto-atendido')).toBeTruthy()
  })

  it('does NOT render badge when completed manually (completedBy=user)', () => {
    vi.mocked(useChecklist).mockReturnValue({
      data: {
        items: [
          {
            id: 'i-1',
            proposalId: 'prop-1',
            itemKey: 'driver_license',
            label: 'CNH do condutor',
            isRequired: false,
            isCompleted: true,
            completedBy: 'user-1',
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        ],
        summary: {
          total: 1,
          completed: 1,
          required: 0,
          requiredCompleted: 0,
          canAdvance: true,
        },
      },
      isLoading: false,
      isError: false,
    } as never)
    renderPanel()
    expect(screen.queryByText('Auto-atendido')).toBeNull()
  })

  it('does NOT render badge when isCompleted=false', () => {
    vi.mocked(useChecklist).mockReturnValue({
      data: {
        items: [
          {
            id: 'i-1',
            proposalId: 'prop-1',
            itemKey: 'driver_license',
            label: 'CNH do condutor',
            isRequired: false,
            isCompleted: false,
            completedBy: null,
            completedAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
        summary: {
          total: 1,
          completed: 0,
          required: 0,
          requiredCompleted: 0,
          canAdvance: true,
        },
      },
      isLoading: false,
      isError: false,
    } as never)
    renderPanel()
    expect(screen.queryByText('Auto-atendido')).toBeNull()
  })
})
