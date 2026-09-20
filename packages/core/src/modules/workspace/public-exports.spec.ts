import { describe, expect, it } from 'vitest'
import * as core from '../../index.js'

describe('workspace public exports', () => {
  it('PrismaMemberRepository is not exported from @repo/core', () => {
    expect('PrismaMemberRepository' in core).toBe(false)
  })
})
