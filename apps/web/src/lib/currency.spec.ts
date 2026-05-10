import { describe, expect, it } from 'vitest'

import {
  basisToDisplay,
  centsToDisplay,
  cleanPastedBRL,
  cleanPastedPercent,
  formatBRLInput,
  formatPercentInput,
  parseBRLToCents,
  parsePercentToBasis,
} from './currency'

describe('parseBRLToCents', () => {
  it('returns 0 for empty string', () => {
    expect(parseBRLToCents('')).toBe(0)
  })
  it('parses simple decimal value', () => {
    expect(parseBRLToCents('2719,48')).toBe(271948)
  })
  it('parses formatted value with thousand separators', () => {
    expect(parseBRLToCents('2.719,48')).toBe(271948)
  })
  it('parses value with R$ prefix', () => {
    expect(parseBRLToCents('R$ 2.719,48')).toBe(271948)
  })
  it('parses integer without decimals', () => {
    expect(parseBRLToCents('1500')).toBe(150000)
  })
  it('returns 0 for negative values', () => {
    expect(parseBRLToCents('-100')).toBe(0)
  })
  it('returns 0 for invalid input', () => {
    expect(parseBRLToCents('abc')).toBe(0)
  })
  it('handles small values', () => {
    expect(parseBRLToCents('0,50')).toBe(50)
  })
  it('handles single cent', () => {
    expect(parseBRLToCents('0,01')).toBe(1)
  })
  it('handles large values', () => {
    expect(parseBRLToCents('999.999.999,99')).toBe(99999999999)
  })
})

describe('centsToDisplay', () => {
  it('returns empty string for 0', () => {
    expect(centsToDisplay(0)).toBe('')
  })
  it('formats single cent', () => {
    expect(centsToDisplay(1)).toBe('0,01')
  })
  it('formats 100 cents as 1,00', () => {
    expect(centsToDisplay(100)).toBe('1,00')
  })
  it('formats with thousand separators', () => {
    expect(centsToDisplay(271948)).toBe('2.719,48')
  })
  it('formats large values', () => {
    expect(centsToDisplay(15000000)).toBe('150.000,00')
  })
})

describe('formatBRLInput', () => {
  it('returns empty for empty string', () => {
    expect(formatBRLInput('')).toBe('')
  })
  it('strips non-digit/comma chars', () => {
    expect(formatBRLInput('abc123')).toBe('123')
  })
  it('adds thousand separators', () => {
    expect(formatBRLInput('1234567')).toBe('1.234.567')
  })
  it('preserves comma as decimal separator', () => {
    expect(formatBRLInput('2719,48')).toBe('2.719,48')
  })
  it('enforces max 2 decimal places', () => {
    expect(formatBRLInput('100,999')).toBe('100,99')
  })
  it('strips leading zeros', () => {
    expect(formatBRLInput('007')).toBe('7')
  })
  it('handles multiple commas — uses first as decimal, strips rest', () => {
    expect(formatBRLInput('1,500,00')).toBe('1,50')
  })
  it('handles only comma', () => {
    expect(formatBRLInput(',')).toBe(',')
  })
})

describe('cleanPastedBRL', () => {
  it('strips R$ prefix', () => {
    expect(cleanPastedBRL('R$ 2.719,48')).toBe('2.719,48')
  })
  it('trims whitespace', () => {
    expect(cleanPastedBRL('  1500,00  ')).toBe('1500,00')
  })
  it('handles value without prefix', () => {
    expect(cleanPastedBRL('3.450,99')).toBe('3.450,99')
  })
})

describe('cleanPastedPercent', () => {
  it('strips % suffix', () => {
    expect(cleanPastedPercent('15,50%')).toBe('15,50')
  })
  it('trims whitespace', () => {
    expect(cleanPastedPercent('  20  ')).toBe('20')
  })
  it('handles value without suffix', () => {
    expect(cleanPastedPercent('15,50')).toBe('15,50')
  })
})

describe('parsePercentToBasis', () => {
  it('returns 0 for empty string', () => {
    expect(parsePercentToBasis('')).toBe(0)
  })
  it('parses simple percentage', () => {
    expect(parsePercentToBasis('15,50')).toBe(1550)
  })
  it('clamps to max (10000 = 100%)', () => {
    expect(parsePercentToBasis('150')).toBe(10000)
  })
  it('parses integer percentage', () => {
    expect(parsePercentToBasis('25')).toBe(2500)
  })
  it('strips non-digit chars (negative sign becomes positive)', () => {
    expect(parsePercentToBasis('-5')).toBe(500)
  })
  it('accepts custom max', () => {
    expect(parsePercentToBasis('50', 5000)).toBe(5000)
  })
})

describe('basisToDisplay', () => {
  it('returns empty string for 0', () => {
    expect(basisToDisplay(0)).toBe('')
  })
  it('formats basis points as percentage', () => {
    expect(basisToDisplay(1550)).toBe('15,50')
  })
  it('formats 100% as 100,00', () => {
    expect(basisToDisplay(10000)).toBe('100,00')
  })
  it('formats small basis points', () => {
    expect(basisToDisplay(1)).toBe('0,01')
  })
})

describe('formatPercentInput', () => {
  it('returns empty for empty string', () => {
    expect(formatPercentInput('')).toBe('')
  })
  it('passes through valid percentage', () => {
    expect(formatPercentInput('15,50')).toBe('15,50')
  })
  it('clamps integer above max to max,00', () => {
    expect(formatPercentInput('150')).toBe('100,00')
  })
  it('clamps decimal above max to max,00', () => {
    expect(formatPercentInput('100,50')).toBe('100,00')
  })
  it('allows exactly 100,00', () => {
    expect(formatPercentInput('100,00')).toBe('100,00')
  })
  it('enforces max 2 decimal places', () => {
    expect(formatPercentInput('15,999')).toBe('15,99')
  })
  it('strips leading zeros', () => {
    expect(formatPercentInput('015')).toBe('15')
  })
  it('accepts custom max', () => {
    expect(formatPercentInput('60', 50)).toBe('50,00')
  })
})
