import { describe, it, expect } from 'vitest'
import { isValidVin, normalizeVin } from './vin'

describe('normalizeVin', () => {
  it('uppercases and trims', () => {
    expect(normalizeVin(' 9bwzzz377vt004251 ')).toBe('9BWZZZ377VT004251')
  })
})

describe('isValidVin', () => {
  it('accepts 17 alphanumeric (no I/O/Q)', () => {
    expect(isValidVin('9BWZZZ377VT004251')).toBe(true)
  })

  it('rejects length != 17', () => {
    expect(isValidVin('123')).toBe(false)
    expect(isValidVin('A'.repeat(18))).toBe(false)
  })

  it('rejects forbidden chars I/O/Q', () => {
    expect(isValidVin('9BWZZZ377VT00425I')).toBe(false)
    expect(isValidVin('9BWZZZ377VT00425O')).toBe(false)
    expect(isValidVin('9BWZZZ377VT00425Q')).toBe(false)
  })
})
