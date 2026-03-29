import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signRequest } from '@repo/shared'
import { internalAuthMiddleware } from '../internal-auth-middleware.js'

// Literal value required here — vi.mock is hoisted, so variables are not yet initialised
const TEST_SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

vi.mock('@repo/env', () => ({
  env: {
    INTERNAL_API_SECRET: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
}))

// Suppress pino output during tests
vi.mock('pino', () => ({
  default: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}))

function mockReply() {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
}

function makeHeaders(
  overrides: Record<string, string | string[] | undefined> = {}
) {
  return { ...overrides }
}

function makeValidSignature(
  options: {
    method?: string
    path?: string
    tenantId?: string
    body?: string
    timestamp?: number
  } = {}
) {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000)
  const method = options.method ?? 'POST'
  const path = options.path ?? '/internal/test'
  const tenantId = options.tenantId ?? 'tenant-1'
  const body = options.body ?? ''

  const signature = signRequest({
    secret: TEST_SECRET,
    method,
    path,
    tenantId,
    body,
    timestamp,
  })

  return { signature, timestamp, method, path, tenantId, body }
}

describe('internalAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when x-signature header is missing', async () => {
    const { timestamp, tenantId } = makeValidSignature()
    const request = {
      headers: makeHeaders({
        'x-timestamp': String(timestamp),
        'x-tenant-id': tenantId,
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
  })

  it('returns 401 when x-timestamp header is missing', async () => {
    const { signature, tenantId } = makeValidSignature()
    const request = {
      headers: makeHeaders({
        'x-signature': signature,
        'x-tenant-id': tenantId,
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
  })

  it('returns 401 when x-tenant-id header is missing', async () => {
    const { signature, timestamp } = makeValidSignature()
    const request = {
      headers: makeHeaders({
        'x-signature': signature,
        'x-timestamp': String(timestamp),
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when timestamp header is not a valid number', async () => {
    const { signature, tenantId } = makeValidSignature()
    const request = {
      headers: makeHeaders({
        'x-signature': signature,
        'x-timestamp': 'not-a-number',
        'x-tenant-id': tenantId,
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
  })

  it('returns 403 when signature is invalid', async () => {
    const { timestamp, tenantId } = makeValidSignature()
    const request = {
      headers: makeHeaders({
        'x-signature': 'a'.repeat(64),
        'x-timestamp': String(timestamp),
        'x-tenant-id': tenantId,
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    )
  })

  it('returns 403 when signature is expired', async () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 400
    const { signature, tenantId } = makeValidSignature({
      timestamp: expiredTimestamp,
    })
    const request = {
      headers: makeHeaders({
        'x-signature': signature,
        'x-timestamp': String(expiredTimestamp),
        'x-tenant-id': tenantId,
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(403)
  })

  it('sets organizationId and passes through with a valid signature', async () => {
    const tenantId = 'tenant-123'
    const method = 'POST'
    const path = '/internal/test'
    const body = JSON.stringify({ foo: 'bar' })
    const timestamp = Math.floor(Date.now() / 1000)

    const signature = signRequest({
      secret: TEST_SECRET,
      method,
      path,
      tenantId,
      body,
      timestamp,
    })

    const request = {
      headers: makeHeaders({
        'x-signature': signature,
        'x-timestamp': String(timestamp),
        'x-tenant-id': tenantId,
      }),
      method,
      url: path,
      body: { foo: 'bar' },
      organizationId: undefined,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).not.toHaveBeenCalled()
    expect(reply.send).not.toHaveBeenCalled()
    expect(request.organizationId).toBe(tenantId)
  })

  it('returns 503 when INTERNAL_API_SECRET is not configured', async () => {
    const { env } = await import('@repo/env')
    const originalSecret = env.INTERNAL_API_SECRET
    // Temporarily clear the secret
    Object.assign(env, { INTERNAL_API_SECRET: undefined })

    const { timestamp, signature, tenantId } = makeValidSignature()
    const request = {
      headers: makeHeaders({
        'x-signature': signature,
        'x-timestamp': String(timestamp),
        'x-tenant-id': tenantId,
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(503)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'SERVICE_UNAVAILABLE' }),
      })
    )

    // Restore secret
    Object.assign(env, { INTERNAL_API_SECRET: originalSecret })
  })

  it('ignores array header values for x-signature', async () => {
    const { timestamp, tenantId } = makeValidSignature()
    const request = {
      headers: makeHeaders({
        'x-signature': ['sig1', 'sig2'],
        'x-timestamp': String(timestamp),
        'x-tenant-id': tenantId,
      }),
      method: 'POST',
      url: '/internal/test',
      body: null,
    }
    const reply = mockReply()

    await internalAuthMiddleware(request as never, reply as never)

    // Array values are treated as undefined by headerAsString, so this is a missing header
    expect(reply.status).toHaveBeenCalledWith(401)
  })
})
