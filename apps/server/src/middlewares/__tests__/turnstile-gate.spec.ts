import type { FastifyReply, FastifyRequest } from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const envMock = {
  TURNSTILE_SECRET_KEY: undefined as string | undefined,
}

vi.mock('@repo/env', () => ({
  env: envMock,
}))

const { turnstileGateHook } = await import('../turnstile-gate.js')

function makeReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue(undefined),
  } as unknown as FastifyReply
}

interface MakeRequestOpts {
  url: string
  body?: unknown
  ip?: string
  xff?: string
}

function makeRequest(opts: MakeRequestOpts): FastifyRequest {
  return {
    url: opts.url,
    body: opts.body,
    ip: opts.ip ?? '10.0.0.1',
    headers: opts.xff ? { 'x-forwarded-for': opts.xff } : {},
    log: { warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest
}

const fetchMock = vi.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  envMock.TURNSTILE_SECRET_KEY = undefined
  vi.clearAllMocks()
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('turnstileGateHook', () => {
  it('no-op quando TURNSTILE_SECRET_KEY não configurado (dev)', async () => {
    envMock.TURNSTILE_SECRET_KEY = undefined
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({ url: '/api/auth/sign-up/email', body: {} }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no-op em paths não-signup mesmo com secret setado', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({ url: '/api/auth/sign-in/email', body: {} }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('403 CAPTCHA_REQUIRED quando token ausente no body', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { email: 'a@b.com', password: 'x', name: 'A' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CAPTCHA_REQUIRED' }),
      })
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('403 CAPTCHA_REQUIRED quando turnstileToken é string vazia', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { turnstileToken: '' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CAPTCHA_REQUIRED' }),
      })
    )
  })

  it('valida token contra Cloudflare e passa quando success=true', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret-123'
    fetchMock.mockResolvedValue({
      json: async () => ({ success: true }),
    })
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { turnstileToken: 'cf-token-abc', email: 'a@b.com' },
        ip: '203.0.113.42',
      }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    )
    expect(init.method).toBe('POST')
    const body = init.body as URLSearchParams
    expect(body.get('secret')).toBe('secret-123')
    expect(body.get('response')).toBe('cf-token-abc')
    expect(body.get('remoteip')).toBe('203.0.113.42')
  })

  it('403 CAPTCHA_INVALID quando Cloudflare retorna success=false', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    fetchMock.mockResolvedValue({
      json: async () => ({
        success: false,
        'error-codes': ['timeout-or-duplicate'],
      }),
    })
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { turnstileToken: 'expired' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CAPTCHA_INVALID' }),
      })
    )
  })

  it('usa x-forwarded-for primeiro IP quando presente', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    fetchMock.mockResolvedValue({ json: async () => ({ success: true }) })
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { turnstileToken: 'tok' },
        xff: '198.51.100.7, 10.0.0.1',
      }),
      reply
    )
    const init = fetchMock.mock.calls[0]?.[1]
    const body = init.body as URLSearchParams
    expect(body.get('remoteip')).toBe('198.51.100.7')
  })

  it('fail-open quando Cloudflare network error (não bloqueia signup)', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { turnstileToken: 'tok' },
      }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('403 CAPTCHA_INVALID quando response JSON malformado', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    fetchMock.mockResolvedValue({
      json: async () => ({ unexpected: 'shape' }),
    })
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { turnstileToken: 'tok' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'CAPTCHA_INVALID' }),
      })
    )
  })

  it('valida path canônico com query string (mesmo padrão de signup-gate)', async () => {
    envMock.TURNSTILE_SECRET_KEY = 'secret'
    fetchMock.mockResolvedValue({ json: async () => ({ success: true }) })
    const reply = makeReply()
    await turnstileGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email?ref=campaign',
        body: { turnstileToken: 'tok' },
      }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
