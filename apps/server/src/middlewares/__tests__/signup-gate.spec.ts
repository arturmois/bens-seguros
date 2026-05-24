import type { FastifyReply, FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const envMock = {
  SIGNUP_MODE: 'self_serve' as 'closed' | 'self_serve',
}

vi.mock('@repo/env', () => ({
  env: envMock,
}))

const { signupGateHook } = await import('../signup-gate.js')

function makeReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue(undefined),
  }
  return reply as unknown as FastifyReply
}

function makeRequest(url: string): FastifyRequest {
  return { url } as unknown as FastifyRequest
}

describe('signupGateHook', () => {
  beforeEach(() => {
    envMock.SIGNUP_MODE = 'self_serve'
  })

  it('passes through when SIGNUP_MODE=self_serve regardless of path', async () => {
    envMock.SIGNUP_MODE = 'self_serve'
    const reply = makeReply()
    await signupGateHook(makeRequest('/api/auth/sign-up/email'), reply)
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('passes through for non-signup paths even when SIGNUP_MODE=closed', async () => {
    envMock.SIGNUP_MODE = 'closed'
    const reply = makeReply()
    await signupGateHook(makeRequest('/api/auth/sign-in/email'), reply)
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('passes through for forget-password when SIGNUP_MODE=closed', async () => {
    envMock.SIGNUP_MODE = 'closed'
    const reply = makeReply()
    await signupGateHook(makeRequest('/api/auth/forget-password'), reply)
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('passes through for send-verification-email when SIGNUP_MODE=closed', async () => {
    envMock.SIGNUP_MODE = 'closed'
    const reply = makeReply()
    await signupGateHook(
      makeRequest('/api/auth/send-verification-email'),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('returns 403 SIGNUP_CLOSED on /api/auth/sign-up/email when SIGNUP_MODE=closed', async () => {
    envMock.SIGNUP_MODE = 'closed'
    const reply = makeReply()
    await signupGateHook(makeRequest('/api/auth/sign-up/email'), reply)
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'SIGNUP_CLOSED' }),
      })
    )
  })

  it('matches the canonical signup suffix regardless of host prefix', async () => {
    envMock.SIGNUP_MODE = 'closed'
    const reply = makeReply()
    await signupGateHook(
      makeRequest('https://api.bensseg.com/api/auth/sign-up/email'),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
  })

  it('blocks signup even when a query string is appended (no endsWith bypass)', async () => {
    envMock.SIGNUP_MODE = 'closed'
    const reply = makeReply()
    await signupGateHook(
      makeRequest('/api/auth/sign-up/email?ref=tracking'),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
  })
})
