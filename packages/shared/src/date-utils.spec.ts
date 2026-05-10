import { describe, expect, it } from 'vitest'
import {
  isLeapYear,
  isValidDate,
  applyCenturyPivot,
  parseFlexibleDate,
  normalizeToMask,
  formatDateToBR,
} from './date-utils.js'

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

describe('applyCenturyPivot', () => {
  it('maps years >= 30 to 19xx', () => {
    expect(applyCenturyPivot(30)).toBe(1930)
    expect(applyCenturyPivot(99)).toBe(1999)
    expect(applyCenturyPivot(75)).toBe(1975)
  })
  it('maps years < 30 to 20xx', () => {
    expect(applyCenturyPivot(0)).toBe(2000)
    expect(applyCenturyPivot(29)).toBe(2029)
    expect(applyCenturyPivot(15)).toBe(2015)
  })
})

describe('parseFlexibleDate', () => {
  it('parses DD/MM/AAAA', () => {
    const d = parseFlexibleDate('01/01/1990')
    expect(d).toEqual(new Date(Date.UTC(1990, 0, 1)))
  })
  it('parses DD-MM-AAAA', () => {
    const d = parseFlexibleDate('15-03-2024')
    expect(d).toEqual(new Date(Date.UTC(2024, 2, 15)))
  })
  it('parses DDMMAAAA (sem separador)', () => {
    const d = parseFlexibleDate('01011990')
    expect(d).toEqual(new Date(Date.UTC(1990, 0, 1)))
  })
  it('parses DDMMAA (sem separador, pivot 30 → 1930)', () => {
    const d = parseFlexibleDate('010130')
    expect(d).toEqual(new Date(Date.UTC(1930, 0, 1)))
  })
  it('parses DDMMAA (sem separador, pivot 29 → 2029)', () => {
    const d = parseFlexibleDate('010129')
    expect(d).toEqual(new Date(Date.UTC(2029, 0, 1)))
  })
  it('trims leading/trailing whitespace', () => {
    expect(parseFlexibleDate('  01/01/1990  ')).toEqual(
      new Date(Date.UTC(1990, 0, 1))
    )
  })
  it('returns null for empty input', () => {
    expect(parseFlexibleDate('')).toBeNull()
    expect(parseFlexibleDate('   ')).toBeNull()
  })
  it('returns null for invalid dates', () => {
    expect(parseFlexibleDate('32/13/2020')).toBeNull()
    expect(parseFlexibleDate('29/02/2023')).toBeNull()
    expect(parseFlexibleDate('31/04/2024')).toBeNull()
  })
  it('returns null for non-numeric input', () => {
    expect(parseFlexibleDate('abc')).toBeNull()
    expect(parseFlexibleDate('aa/bb/cccc')).toBeNull()
  })
  it('returns null for ambiguous short input with separator (DD/MM/AA)', () => {
    expect(parseFlexibleDate('01/01/19')).toBeNull()
  })
  it('returns null for ISO format (AAAA-MM-DD) — out of scope', () => {
    expect(parseFlexibleDate('1990-01-01')).toBeNull()
  })
  it('returns null for input with text around date', () => {
    expect(parseFlexibleDate('Nascido em 01/01/1990')).toBeNull()
  })
  it('returns null for year outside acceptable range', () => {
    expect(parseFlexibleDate('01/01/1800')).toBeNull()
  })
  it('accepts Feb 29 on leap year', () => {
    const d = parseFlexibleDate('29/02/2024')
    expect(d).toEqual(new Date(Date.UTC(2024, 1, 29)))
  })
})

describe('normalizeToMask', () => {
  it('inserts slashes into 8-digit input', () => {
    expect(normalizeToMask('01011990')).toBe('01/01/1990')
  })
  it('inserts slashes into 6-digit input', () => {
    expect(normalizeToMask('010130')).toBe('01/01/30')
  })
  it('replaces hyphens with slashes', () => {
    expect(normalizeToMask('01-01-1990')).toBe('01/01/1990')
  })
  it('preserves already-formatted input', () => {
    expect(normalizeToMask('01/01/1990')).toBe('01/01/1990')
  })
  it('strips non-date characters', () => {
    expect(normalizeToMask('abc01011990xyz')).toBe('01/01/1990')
  })
  it('strips whitespace', () => {
    expect(normalizeToMask('  01/01/1990  ')).toBe('01/01/1990')
  })
  it('handles datetime suffix by truncating to date only', () => {
    expect(normalizeToMask('01/01/1990 10:30')).toBe('01/01/1990')
  })
  it('returns empty string for empty input', () => {
    expect(normalizeToMask('')).toBe('')
  })
  it('returns partial digits when length is not 6 or 8', () => {
    expect(normalizeToMask('0101')).toBe('0101')
    expect(normalizeToMask('010')).toBe('010')
  })
  it('truncates to 10 chars max (DD/MM/AAAA)', () => {
    expect(normalizeToMask('01/01/19901234')).toBe('01/01/1990')
  })
})

describe('formatDateToBR', () => {
  it('formats Date to DD/MM/AAAA with zero padding', () => {
    const date = new Date(Date.UTC(1990, 0, 1))
    expect(formatDateToBR(date)).toBe('01/01/1990')
  })
  it('formats multi-digit day/month', () => {
    const date = new Date(Date.UTC(2026, 2, 15))
    expect(formatDateToBR(date)).toBe('15/03/2026')
  })
  it('uses UTC to avoid timezone drift', () => {
    const date = new Date(Date.UTC(2024, 11, 31))
    expect(formatDateToBR(date)).toBe('31/12/2024')
  })
})
