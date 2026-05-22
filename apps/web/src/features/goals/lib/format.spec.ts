import { describe, expect, it } from 'vitest'
import { splitAnnualToMonths } from './format'

describe('splitAnnualToMonths', () => {
  it('splits 120_000 cents into 12 × 10_000', () => {
    const result = splitAnnualToMonths(120_000)
    expect(result).toHaveLength(12)
    expect(result.every((v) => v === 10_000)).toBe(true)
  })
  it('puts the remainder in December (month 12)', () => {
    const result = splitAnnualToMonths(100)
    expect(result.slice(0, 11).every((v) => v === 8)).toBe(true)
    expect(result[11]).toBe(12)
    expect(result.reduce((a, b) => a + b, 0)).toBe(100)
  })
  it('returns zeros for 0 input', () => {
    expect(splitAnnualToMonths(0)).toEqual(Array(12).fill(0))
  })
  it('returns zeros for negative input', () => {
    expect(splitAnnualToMonths(-1)).toEqual(Array(12).fill(0))
  })
})
