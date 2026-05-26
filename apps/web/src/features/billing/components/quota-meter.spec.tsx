// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { QuotaMeter } from './quota-meter'

afterEach(() => {
  cleanup()
})

describe('QuotaMeter', () => {
  it('renders "Ilimitado" with infinity icon when limit is null', () => {
    render(<QuotaMeter label="Mensagens IA" value={1000} limit={null} />)
    expect(screen.getByText('Mensagens IA')).toBeTruthy()
    expect(screen.getByText('Ilimitado')).toBeTruthy()
  })

  it('renders meter with value/limit and unit when bounded', () => {
    render(
      <QuotaMeter label="Propostas" value={42} limit={100} unit="por mês" />
    )
    expect(screen.getByText('Propostas')).toBeTruthy()
    expect(screen.getByText(/42 \/ 100 por mês/)).toBeTruthy()
  })

  it('uses default (primary) indicator color below 80% usage', () => {
    const { container } = render(
      <QuotaMeter label="X" value={10} limit={100} />
    )
    const indicator = container.querySelector('[data-slot="meter-indicator"]')
    expect(indicator?.className.includes('bg-warning')).toBe(false)
    expect(indicator?.className.includes('bg-destructive')).toBe(false)
  })

  it('applies warning color at 80-99% usage', () => {
    const { container } = render(
      <QuotaMeter label="X" value={85} limit={100} />
    )
    const indicator = container.querySelector('[data-slot="meter-indicator"]')
    expect(indicator?.className.includes('bg-warning')).toBe(true)
    expect(indicator?.className.includes('bg-destructive')).toBe(false)
  })

  it('applies destructive color when value >= limit (100%+)', () => {
    const { container } = render(
      <QuotaMeter label="X" value={100} limit={100} />
    )
    const indicator = container.querySelector('[data-slot="meter-indicator"]')
    expect(indicator?.className.includes('bg-destructive')).toBe(true)
  })

  it('still renders cleanly when value exceeds limit', () => {
    render(<QuotaMeter label="Y" value={150} limit={100} />)
    expect(screen.getByText(/150 \/ 100/)).toBeTruthy()
  })
})
