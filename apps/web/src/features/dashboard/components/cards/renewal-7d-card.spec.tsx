// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Renewal7dCard } from './renewal-7d-card'

afterEach(cleanup)

describe('Renewal7dCard', () => {
  it('renders loading skeleton', () => {
    render(
      <Renewal7dCard count={undefined} premiumCents={undefined} isLoading />
    )
    expect(screen.getByTestId('renewal-7d-card-loading')).toBeTruthy()
  })
  it('renders count and formatted premium', () => {
    render(
      <Renewal7dCard count={7} premiumCents={2_345_000} isLoading={false} />
    )
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText(/R\$[\s\S]*23\.450,00/)).toBeTruthy()
  })
  it('links to /policies with filter=expiring-7d', () => {
    render(<Renewal7dCard count={7} premiumCents={0} isLoading={false} />)
    const link = screen.getByRole('link', { name: /renovações/i })
    expect(link.getAttribute('href')).toBe('/policies?filter=expiring-7d')
  })
})
