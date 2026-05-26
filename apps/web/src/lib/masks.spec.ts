import { describe, expect, it } from 'vitest'

import { sanitizeDocumentForMask } from './masks'

describe('sanitizeDocumentForMask', () => {
  it('returns empty string for null', () => {
    expect(sanitizeDocumentForMask(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(sanitizeDocumentForMask(undefined)).toBe('')
  })

  it('returns empty string for non-string input', () => {
    expect(sanitizeDocumentForMask(123)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(sanitizeDocumentForMask('')).toBe('')
  })

  it('returns empty string for censored CNPJ (**.***.***/0001-95)', () => {
    expect(sanitizeDocumentForMask('**.***.***/0001-95')).toBe('')
  })

  it('returns empty string for censored CPF (***.***.***-09)', () => {
    expect(sanitizeDocumentForMask('***.***.***-09')).toBe('')
  })

  it('preserves partial digits during typing', () => {
    expect(sanitizeDocumentForMask('123')).toBe('123')
  })

  it('preserves already-formatted CPF', () => {
    expect(sanitizeDocumentForMask('123.456.789-01')).toBe('123.456.789-01')
  })

  it('preserves already-formatted CNPJ', () => {
    expect(sanitizeDocumentForMask('12.345.678/0001-95')).toBe(
      '12.345.678/0001-95'
    )
  })

  it('preserves raw digits-only string (InputMask formats on its own)', () => {
    expect(sanitizeDocumentForMask('12345678000195')).toBe('12345678000195')
  })
})
