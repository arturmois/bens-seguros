// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../hooks/use-entitlements', () => ({
  useEntitlements: vi.fn(),
}))

import { useEntitlements } from '../hooks/use-entitlements'
import { PlanGate } from './plan-gate'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockUseEntitlements = vi.mocked(useEntitlements)

function mockReturn(overrides: Partial<ReturnType<typeof useEntitlements>>) {
  mockUseEntitlements.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useEntitlements>)
}

describe('PlanGate', () => {
  it('renders loadingFallback while isLoading', () => {
    mockReturn({ isLoading: true })
    render(
      <PlanGate
        feature="aiEnabled"
        loadingFallback={<div data-testid="loading">L</div>}
      >
        <div data-testid="content">child</div>
      </PlanGate>
    )
    expect(screen.getByTestId('loading')).toBeTruthy()
    expect(screen.queryByTestId('content')).toBeNull()
  })

  it('renders fallback when isError', () => {
    mockReturn({ isError: true })
    render(
      <PlanGate
        feature="apiAccess"
        fallback={<div data-testid="fallback">F</div>}
      >
        <div data-testid="content">child</div>
      </PlanGate>
    )
    expect(screen.getByTestId('fallback')).toBeTruthy()
    expect(screen.queryByTestId('content')).toBeNull()
  })

  it('renders children when entitlement is true', () => {
    mockReturn({
      data: {
        aiEnabled: true,
        apiAccess: false,
      } as never,
    })
    render(
      <PlanGate feature="aiEnabled" fallback={<div>fb</div>}>
        <div data-testid="content">child</div>
      </PlanGate>
    )
    expect(screen.getByTestId('content')).toBeTruthy()
  })

  it('renders fallback when entitlement is false', () => {
    mockReturn({
      data: {
        aiEnabled: true,
        apiAccess: false,
      } as never,
    })
    render(
      <PlanGate
        feature="apiAccess"
        fallback={<div data-testid="fallback">F</div>}
      >
        <div data-testid="content">child</div>
      </PlanGate>
    )
    expect(screen.getByTestId('fallback')).toBeTruthy()
    expect(screen.queryByTestId('content')).toBeNull()
  })

  it('default fallback is null (silently hides)', () => {
    mockReturn({
      data: { apiAccess: false } as never,
    })
    const { container } = render(
      <PlanGate feature="apiAccess">
        <div data-testid="content">child</div>
      </PlanGate>
    )
    expect(container.firstChild).toBeNull()
  })
})
