// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StageTracker } from './stage-tracker'

describe('StageTracker', () => {
  it('renderiza 5 segmentos + labels', () => {
    render(<StageTracker currentStage="QUOTE" variant="default" />)
    expect(screen.getByText('Captação')).toBeTruthy()
    expect(screen.getByText('Cotação')).toBeTruthy()
    expect(screen.getByText('Protocolo')).toBeTruthy()
    expect(screen.getByText('Vistoria')).toBeTruthy()
    expect(screen.getByText('Pagamento')).toBeTruthy()
  })

  it('marca o estágio atual com data-state="current"', () => {
    render(<StageTracker currentStage="QUOTE" variant="default" />)
    const current = screen.getByTestId('stage-seg-QUOTE')
    expect(current.getAttribute('data-state')).toBe('current')
  })

  it('marca estágios anteriores como done', () => {
    render(<StageTracker currentStage="INSPECTION" variant="default" />)
    expect(
      screen.getByTestId('stage-seg-CAPTURE').getAttribute('data-state')
    ).toBe('done')
    expect(
      screen.getByTestId('stage-seg-QUOTE').getAttribute('data-state')
    ).toBe('done')
    expect(
      screen.getByTestId('stage-seg-INSPECTION').getAttribute('data-state')
    ).toBe('current')
    expect(
      screen.getByTestId('stage-seg-PAYMENT').getAttribute('data-state')
    ).toBe('future')
  })

  it('variant="lost" marca o estágio atual como lost', () => {
    render(<StageTracker currentStage="QUOTE" variant="lost" />)
    expect(
      screen.getByTestId('stage-seg-QUOTE').getAttribute('data-state')
    ).toBe('lost')
  })

  it('variant="success" marca todos como done', () => {
    render(<StageTracker currentStage="POLICY_ISSUED" variant="success" />)
    expect(
      screen.getByTestId('stage-seg-CAPTURE').getAttribute('data-state')
    ).toBe('done')
    expect(
      screen.getByTestId('stage-seg-PAYMENT').getAttribute('data-state')
    ).toBe('done')
  })

  it('hideLabels=true esconde os labels', () => {
    render(<StageTracker currentStage="QUOTE" variant="default" hideLabels />)
    expect(screen.queryByText('Captação')).toBeNull()
  })
})
