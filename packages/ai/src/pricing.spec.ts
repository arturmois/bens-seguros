import { describe, expect, it } from 'vitest'
import { calculateCostMicrocents } from './pricing.js'

describe('calculateCostMicrocents', () => {
  it('returns exact cost for Claude Sonnet 4: 1k input + 500 output', () => {
    const result = calculateCostMicrocents({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 500,
    })

    expect(result.inputCostMicrocents).toBe(150)
    expect(result.outputCostMicrocents).toBe(375)
    expect(result.unitType).toBe('TOKEN')
  })

  it('returns positive cost for gpt-4o-mini', () => {
    const result = calculateCostMicrocents({
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: 10000,
      outputTokens: 5000,
    })

    expect(result.inputCostMicrocents).toBeGreaterThan(0)
    expect(result.outputCostMicrocents).toBeGreaterThan(0)
    expect(result.unitType).toBe('TOKEN')
  })

  it('falls back to Sonnet pricing for unknown model (conservative)', () => {
    const sonnet = calculateCostMicrocents({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 1000,
    })
    const unknown = calculateCostMicrocents({
      provider: 'anthropic',
      model: 'claude-future-model-9000',
      inputTokens: 1000,
      outputTokens: 1000,
    })

    expect(unknown.inputCostMicrocents).toBe(sonnet.inputCostMicrocents)
    expect(unknown.outputCostMicrocents).toBe(sonnet.outputCostMicrocents)
    expect(unknown.unitType).toBe('TOKEN')
  })

  it('returns zero costs when tokens are zero', () => {
    const result = calculateCostMicrocents({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 0,
      outputTokens: 0,
    })

    expect(result.inputCostMicrocents).toBe(0)
    expect(result.outputCostMicrocents).toBe(0)
  })

  it('rounds fractional microcents up (Math.ceil — prefer revenue over precision)', () => {
    const result = calculateCostMicrocents({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1,
      outputTokens: 0,
    })

    expect(result.inputCostMicrocents).toBeGreaterThan(0)
    expect(Number.isInteger(result.inputCostMicrocents)).toBe(true)
  })
})
