// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ProposalsPendingCard } from './proposals-pending-card'

afterEach(cleanup)

const PENDING_STAGES = 'CAPTURE,QUOTE,PROTOCOL,INSPECTION,PAYMENT'

describe('ProposalsPendingCard', () => {
  it('renders loading skeleton', () => {
    render(<ProposalsPendingCard data={undefined} isLoading />)
    expect(screen.getByTestId('proposals-pending-card-loading')).toBeTruthy()
  })

  it('renders total and 3 chips', () => {
    render(
      <ProposalsPendingCard
        data={{ total: 19, inDay: 12, warning: 5, critical: 2 }}
        isLoading={false}
      />
    )
    expect(screen.getByText('19')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /12 propostas em dia/i })
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /5 propostas em atenção/i })
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /2 propostas críticas/i })
    ).toBeTruthy()
  })

  it('inDay link has updatedAtFrom but no updatedAtTo', () => {
    render(
      <ProposalsPendingCard
        data={{ total: 19, inDay: 12, warning: 5, critical: 2 }}
        isLoading={false}
      />
    )
    const inDayLink = screen.getByRole('link', { name: /12 propostas em dia/i })
    const href = inDayLink.getAttribute('href') ?? ''
    expect(href).toContain(`stages=${PENDING_STAGES}`)
    expect(href).toContain('updatedAtFrom=')
    expect(href).not.toContain('updatedAtTo=')
  })

  it('critical link has updatedAtTo but no updatedAtFrom', () => {
    render(
      <ProposalsPendingCard
        data={{ total: 19, inDay: 12, warning: 5, critical: 2 }}
        isLoading={false}
      />
    )
    const criticalLink = screen.getByRole('link', {
      name: /2 propostas críticas/i,
    })
    const href = criticalLink.getAttribute('href') ?? ''
    expect(href).toContain('updatedAtTo=')
    expect(href).not.toContain('updatedAtFrom=')
  })

  it('shows empty state when total is zero', () => {
    render(
      <ProposalsPendingCard
        data={{ total: 0, inDay: 0, warning: 0, critical: 0 }}
        isLoading={false}
      />
    )
    expect(screen.getByText(/nenhuma pendente/i)).toBeTruthy()
  })
})
