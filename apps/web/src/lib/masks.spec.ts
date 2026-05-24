import { describe, expect, it } from 'vitest'

import { formatDocumentForMask } from './masks'

describe('formatDocumentForMask', () => {
  it('returns empty string for null', () => {
    expect(formatDocumentForMask(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDocumentForMask(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatDocumentForMask('')).toBe('')
  })

  it('returns empty string for censored CNPJ (**.***.***/0001-95)', () => {
    expect(formatDocumentForMask('**.***.***/0001-95')).toBe('')
  })

  it('returns empty string for censored CPF (***.***.***-09)', () => {
    expect(formatDocumentForMask('***.***.***-09')).toBe('')
  })

  it('returns empty string when value has no digits and no asterisks', () => {
    expect(formatDocumentForMask('abc')).toBe('')
  })

  it('preserves partial digits during typing (no censoring or clearing)', () => {
    expect(formatDocumentForMask('123')).toBe('123')
  })

  it('formats 11-digit raw string as CPF mask', () => {
    expect(formatDocumentForMask('12345678901')).toBe('123.456.789-01')
  })

  it('formats already-formatted CPF string', () => {
    expect(formatDocumentForMask('123.456.789-01')).toBe('123.456.789-01')
  })

  it('formats 12-digit raw string as partial CNPJ mask (typing in progress)', () => {
    expect(formatDocumentForMask('123456789012')).toBe('12.345.678/9012')
  })

  it('formats 14-digit raw string as CNPJ mask', () => {
    expect(formatDocumentForMask('12345678000195')).toBe('12.345.678/0001-95')
  })

  it('formats already-formatted CNPJ string', () => {
    expect(formatDocumentForMask('12.345.678/0001-95')).toBe(
      '12.345.678/0001-95'
    )
  })

  it('truncates to 14 digits for CNPJ with extra digits', () => {
    expect(formatDocumentForMask('123456780001959999')).toBe(
      '12.345.678/0001-95'
    )
  })
})
