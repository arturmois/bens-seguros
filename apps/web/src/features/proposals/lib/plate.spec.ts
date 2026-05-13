import { describe, it, expect } from 'vitest'
import { normalizePlate, isValidPlate, formatPlate } from './plate'

describe('normalizePlate', () => {
  it('uppercases and strips hyphen/spaces', () => {
    expect(normalizePlate('abc-1234')).toBe('ABC1234')
    expect(normalizePlate(' abc 1d23 ')).toBe('ABC1D23')
  })

  it('returns empty for empty input', () => {
    expect(normalizePlate('')).toBe('')
    expect(normalizePlate('   ')).toBe('')
  })
})

describe('isValidPlate', () => {
  it('accepts old format (ABC1234)', () => {
    expect(isValidPlate('ABC1234')).toBe(true)
  })

  it('accepts Mercosul format (ABC1D23)', () => {
    expect(isValidPlate('ABC1D23')).toBe(true)
  })

  it('rejects partial input', () => {
    expect(isValidPlate('ABC123')).toBe(false)
    expect(isValidPlate('AB')).toBe(false)
  })

  it('rejects invalid chars', () => {
    expect(isValidPlate('1234567')).toBe(false)
    expect(isValidPlate('AAAAAAA')).toBe(false)
  })

  it('rejects empty', () => {
    expect(isValidPlate('')).toBe(false)
  })
})

describe('formatPlate', () => {
  it('formats old plate with hyphen', () => {
    expect(formatPlate('ABC1234')).toBe('ABC-1234')
  })

  it('keeps Mercosul as-is', () => {
    expect(formatPlate('ABC1D23')).toBe('ABC1D23')
  })

  it('returns input unchanged if invalid', () => {
    expect(formatPlate('xx')).toBe('xx')
  })
})
