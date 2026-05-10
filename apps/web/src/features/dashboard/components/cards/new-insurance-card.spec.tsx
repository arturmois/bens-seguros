// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NewInsuranceCard } from './new-insurance-card'

afterEach(cleanup)

describe('NewInsuranceCard', () => {
  it('renders loading skeleton when isLoading', () => {
    render(<NewInsuranceCard data={undefined} isLoading preset="30d" />)
    expect(screen.getByTestId('new-insurance-card-loading')).toBeTruthy()
  })
  it('renders count and comparison badge', () => {
    render(
      <NewInsuranceCard
        data={{ current: 12, previous: 10, changePercent: 20 }}
        isLoading={false}
        preset="30d"
      />
    )
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText(/\+20%/)).toBeTruthy()
  })
  it('has a link to filtered policies page with boardType=NEW_INSURANCE', () => {
    render(
      <NewInsuranceCard
        data={{ current: 12, previous: 10, changePercent: 20 }}
        isLoading={false}
        preset="30d"
      />
    )
    const link = screen.getByRole('link', { name: /seguros novos/i })
    expect(link.getAttribute('href')).toContain('boardType=NEW_INSURANCE')
    expect(link.getAttribute('href')).toContain('createdFrom=')
  })
  it('hides comparison badge when previous is zero', () => {
    render(
      <NewInsuranceCard
        data={{ current: 12, previous: 0, changePercent: 100 }}
        isLoading={false}
        preset="30d"
      />
    )
    expect(screen.queryByText(/vs anterior/i)).toBeNull()
  })
})
