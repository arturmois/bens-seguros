// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WarningsCard } from './warnings-card'

afterEach(cleanup)

describe('WarningsCard', () => {
  it('renders loading skeleton', () => {
    render(<WarningsCard data={undefined} isLoading />)
    expect(screen.getByTestId('warnings-card-loading')).toBeTruthy()
  })

  it('renders total and 2 breakdown links', () => {
    render(
      <WarningsCard
        data={{ total: 8, claimsOpen: 5, assistancesOpen: 3 }}
        isLoading={false}
      />
    )
    expect(screen.getByText('8')).toBeTruthy()

    const claimsLink = screen.getByRole('link', { name: /5 sinistros/i })
    expect(claimsLink.getAttribute('href')).toBe('/claims?statusGroup=open')

    const assistLink = screen.getByRole('link', { name: /3 assistências/i })
    expect(assistLink.getAttribute('href')).toBe(
      '/assistances?statusGroup=open'
    )
  })

  it('hides assistances link when count is zero', () => {
    render(
      <WarningsCard
        data={{ total: 5, claimsOpen: 5, assistancesOpen: 0 }}
        isLoading={false}
      />
    )
    expect(screen.queryByRole('link', { name: /assistências/i })).toBeNull()
  })

  it('shows empty state when total is zero', () => {
    render(
      <WarningsCard
        data={{ total: 0, claimsOpen: 0, assistancesOpen: 0 }}
        isLoading={false}
      />
    )
    expect(screen.getByText(/nenhum aviso em aberto/i)).toBeTruthy()
  })
})
