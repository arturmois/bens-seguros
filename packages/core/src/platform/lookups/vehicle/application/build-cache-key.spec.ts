import { describe, it, expect } from 'vitest'
import { buildCacheKey } from './build-cache-key.js'

describe('buildCacheKey', () => {
  it('returns same key for the same plate', () => {
    expect(buildCacheKey({ plate: 'ABC1D23' })).toBe(
      buildCacheKey({ plate: 'ABC1D23' })
    )
  })

  it('returns different keys for plate and chassi sharing same chars', () => {
    const a = buildCacheKey({ plate: 'ABC1D23' })
    const b = buildCacheKey({ chassi: 'ABC1D23' })
    expect(a).not.toBe(b)
  })

  it('prefixes keys with vlookup:', () => {
    expect(buildCacheKey({ plate: 'ABC1D23' })).toMatch(
      /^vlookup:[a-f0-9]{64}$/
    )
  })

  it('uses plate when both plate and chassi present (plate is primary)', () => {
    const both = buildCacheKey({
      plate: 'ABC1D23',
      chassi: '9BWZZZ377VT004251',
    })
    const onlyPlate = buildCacheKey({ plate: 'ABC1D23' })
    expect(both).toBe(onlyPlate)
  })

  it('throws when neither plate nor chassi provided', () => {
    expect(() => buildCacheKey({})).toThrow()
  })

  it('normalizes plate before hashing so case and dashes produce the same key', () => {
    expect(buildCacheKey({ plate: 'abc-1234' })).toBe(
      buildCacheKey({ plate: 'ABC1234' })
    )
  })
})
