import { describe, expect, it } from 'vitest'
import { isLeapYear, isValidDate } from './date-utils.js'

describe('isLeapYear', () => {
  it('returns true for year divisible by 4 but not 100', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(1996)).toBe(true)
  })

  it('returns false for year divisible by 100 but not 400', () => {
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2100)).toBe(false)
  })

  it('returns true for year divisible by 400', () => {
    expect(isLeapYear(2000)).toBe(true)
  })

  it('returns false for non-leap years', () => {
    expect(isLeapYear(2023)).toBe(false)
    expect(isLeapYear(1990)).toBe(false)
  })
})

describe('isValidDate', () => {
  it('accepts valid ordinary dates', () => {
    expect(isValidDate(1, 1, 1990)).toBe(true)
    expect(isValidDate(31, 12, 2024)).toBe(true)
    expect(isValidDate(28, 2, 2023)).toBe(true)
  })

  it('accepts Feb 29 on leap years', () => {
    expect(isValidDate(29, 2, 2024)).toBe(true)
    expect(isValidDate(29, 2, 2000)).toBe(true)
  })

  it('rejects Feb 29 on non-leap years', () => {
    expect(isValidDate(29, 2, 2023)).toBe(false)
    expect(isValidDate(29, 2, 1900)).toBe(false)
  })

  it('rejects impossible month/day combinations', () => {
    expect(isValidDate(31, 4, 2024)).toBe(false)
    expect(isValidDate(31, 2, 2024)).toBe(false)
    expect(isValidDate(32, 1, 2024)).toBe(false)
    expect(isValidDate(0, 1, 2024)).toBe(false)
    expect(isValidDate(1, 13, 2024)).toBe(false)
    expect(isValidDate(1, 0, 2024)).toBe(false)
  })

  it('rejects years outside acceptable range', () => {
    expect(isValidDate(1, 1, 1899)).toBe(false)
    const farFuture = new Date().getFullYear() + 11
    expect(isValidDate(1, 1, farFuture)).toBe(false)
  })
})
