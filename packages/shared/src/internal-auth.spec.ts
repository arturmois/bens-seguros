import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { signRequest, verifyRequest } from './internal-auth.js'

const SECRET = 'a'.repeat(64)
const METHOD = 'POST'
const PATH = '/api/internal/leads'
const TENANT = 'org-1'
const BODY = '{"clientName":"Maria"}'

const baseInput = {
  secret: SECRET,
  method: METHOD,
  path: PATH,
  tenantId: TENANT,
  body: BODY,
  timestamp: 1000000,
}

describe('signRequest', () => {
  it('returns a hex string', () => {
    const sig = signRequest(baseInput)
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })
  it('produces different signatures for different bodies', () => {
    const sig1 = signRequest({ ...baseInput, body: '{"a":1}' })
    const sig2 = signRequest({ ...baseInput, body: '{"a":2}' })
    expect(sig1).not.toBe(sig2)
  })
  it('produces different signatures for different timestamps', () => {
    const sig1 = signRequest(baseInput)
    const sig2 = signRequest({ ...baseInput, timestamp: 1000001 })
    expect(sig1).not.toBe(sig2)
  })
  it('produces different signatures for different tenants', () => {
    const sig1 = signRequest(baseInput)
    const sig2 = signRequest({ ...baseInput, tenantId: 'org-2' })
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
    const sig = signRequest(baseInput)
    expect(verifyRequest({ ...baseInput, signature: sig })).toBe(true)
  })
  it('rejects an invalid signature', () => {
    expect(
      verifyRequest({ ...baseInput, signature: 'bad'.repeat(21) + 'x' })
    ).toBe(false)
  })
  it('rejects a request older than maxAge (default 300s)', () => {
    const old = { ...baseInput, timestamp: 1000000 - 301 }
    const sig = signRequest(old)
    expect(verifyRequest({ ...old, signature: sig })).toBe(false)
  })
  it('accepts a request within maxAge window', () => {
    const recent = { ...baseInput, timestamp: 1000000 - 60 }
    const sig = signRequest(recent)
    expect(verifyRequest({ ...recent, signature: sig })).toBe(true)
  })
  it('rejects a future timestamp beyond maxAge', () => {
    const future = { ...baseInput, timestamp: 1000000 + 301 }
    const sig = signRequest(future)
    expect(verifyRequest({ ...future, signature: sig })).toBe(false)
  })
  it('rejects when signature length does not match', () => {
    expect(verifyRequest({ ...baseInput, signature: 'short' })).toBe(false)
  })
  it('rejects when tenantId differs from signed value', () => {
    const sig = signRequest(baseInput)
    expect(
      verifyRequest({ ...baseInput, tenantId: 'org-hacked', signature: sig })
    ).toBe(false)
  })
})
