// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { UpgradeCta } from './upgrade-cta'

afterEach(() => {
  cleanup()
})

describe('UpgradeCta', () => {
  it('renders default upgrade message with feature label', () => {
    render(<UpgradeCta feature="apiAccess" />)
    expect(screen.getByText(/Acesso à API indisponível/i)).toBeTruthy()
    expect(
      screen.getByText(/não está incluso no seu plano atual/i)
    ).toBeTruthy()
  })

  it('renders custom description when provided', () => {
    render(
      <UpgradeCta
        feature="customBranding"
        description="Personalize o visual com sua marca."
      />
    )
    expect(screen.getByText('Personalize o visual com sua marca.')).toBeTruthy()
  })

  it('renders "Ver planos" CTA linking to settings billing', () => {
    render(<UpgradeCta feature="advancedReports" />)
    const link = screen.getByRole('link', { name: /Ver planos/i })
    expect(link.getAttribute('href')).toBe('/settings?section=billing')
  })
})
