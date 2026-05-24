import { describe, expect, it } from 'vitest'
import { hashIdShort } from './hash.js'

describe('hashIdShort', () => {
  it('returns 16-char hex string', () => {
    const hash = hashIdShort('abc123')

    expect(hash).toMatch(/^[0-9a-f]{16}$/)
    expect(hash).toHaveLength(16)
  })

  it('is deterministic — same input → same output', () => {
    const input = 'conv_abc123def456'

    expect(hashIdShort(input)).toBe(hashIdShort(input))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashIdShort('a')).not.toBe(hashIdShort('b'))
    expect(hashIdShort('conv_1')).not.toBe(hashIdShort('conv_2'))
  })

  it('is one-way — input substring not present in output', () => {
    const input = 'secret-conversation-id-xyz'
    const hash = hashIdShort(input)

    expect(hash).not.toContain('secret')
    expect(hash).not.toContain('xyz')
    expect(hash).not.toContain('conversation')
  })
})
