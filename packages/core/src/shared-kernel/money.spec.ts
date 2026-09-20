import { describe, expect, it } from 'vitest'

import { applyBasisPoints, reaisToCents } from './money.js'

describe('money kernel', () => {
  it('applyBasisPoints 100000c 1500bp default split is 15000', () => {
    expect(applyBasisPoints(100000, 1500)).toBe(15000)
  })
  it('applyBasisPoints 0 bp is 0', () => {
    expect(applyBasisPoints(100000, 0)).toBe(0)
  })
  it('applyBasisPoints 100000c 10000bp default split is 100000', () => {
    expect(applyBasisPoints(100000, 10000)).toBe(100000)
  })
  it('reaisToCents 0.285 is 28', () => {
    expect(reaisToCents(0.285)).toBe(28)
  })
})
