import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { signRequest, verifyRequest } from './internal-auth.js'

const SECRET = 'a'.repeat(64)
const METHOD = 'POST'
const PATH = '/api/internal/leads'
const BODY = '{"clientName":"Maria"}'

describe('signRequest', () => {
  it('returns a hex string', () => {
    const sig = signRequest(SECRET, METHOD, PATH, BODY, 1000000)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces different signatures for different bodies', () => {
    const sig1 = signRequest(SECRET, METHOD, PATH, '{"a":1}', 1000000)
    const sig2 = signRequest(SECRET, METHOD, PATH, '{"a":2}', 1000000)
    expect(sig1).not.toBe(sig2)
  })

  it('produces different signatures for different timestamps', () => {
    const sig1 = signRequest(SECRET, METHOD, PATH, BODY, 1000000)
    const sig2 = signRequest(SECRET, METHOD, PATH, BODY, 1000001)
    expect(sig1).not.toBe(sig2)
  })
})

describe('verifyRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1000000 * 1000))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts a valid signature within time window', () => {
    const timestamp = 1000000
    const sig = signRequest(SECRET, METHOD, PATH, BODY, timestamp)
    expect(verifyRequest(SECRET, sig, METHOD, PATH, BODY, timestamp)).toBe(true)
  })

  it('rejects an invalid signature', () => {
    expect(
      verifyRequest(SECRET, 'bad'.repeat(21) + 'x', METHOD, PATH, BODY, 1000000)
    ).toBe(false)
  })

  it('rejects a request older than maxAge (default 300s)', () => {
    const oldTimestamp = 1000000 - 301
    const sig = signRequest(SECRET, METHOD, PATH, BODY, oldTimestamp)
    expect(verifyRequest(SECRET, sig, METHOD, PATH, BODY, oldTimestamp)).toBe(
      false
    )
  })

  it('accepts a request within maxAge window', () => {
    const recentTimestamp = 1000000 - 60
    const sig = signRequest(SECRET, METHOD, PATH, BODY, recentTimestamp)
    expect(
      verifyRequest(SECRET, sig, METHOD, PATH, BODY, recentTimestamp)
    ).toBe(true)
  })

  it('rejects a future timestamp beyond maxAge', () => {
    const futureTimestamp = 1000000 + 301
    const sig = signRequest(SECRET, METHOD, PATH, BODY, futureTimestamp)
    expect(
      verifyRequest(SECRET, sig, METHOD, PATH, BODY, futureTimestamp)
    ).toBe(false)
  })

  it('rejects when signature length does not match', () => {
    expect(verifyRequest(SECRET, 'short', METHOD, PATH, BODY, 1000000)).toBe(
      false
    )
  })
})
