import type { FastifyReply, FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { tempmailGateHook } from '../tempmail-gate.js'

function makeReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue(undefined),
  } as unknown as FastifyReply
}

function makeRequest(opts: { url: string; body?: unknown }): FastifyRequest {
  return {
    url: opts.url,
    body: opts.body,
    log: { warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('tempmailGateHook', () => {
  it('no-op em paths não-signup mesmo com email tempmail', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-in/email',
        body: { email: 'x@mailinator.com' },
      }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('no-op quando email ausente do body (deixa Better Auth validar)', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({ url: '/api/auth/sign-up/email', body: {} }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('no-op quando body não é object (Zod safeParse fails)', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({ url: '/api/auth/sign-up/email', body: 'invalid' }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('no-op quando email não tem @ (Zod email() rejeita)', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { email: 'invalid-email' },
      }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('aceita domínio legítimo (gmail.com)', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { email: 'user@gmail.com' },
      }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('aceita domínio corporativo arbitrário', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { email: 'foo@bensseg.com' },
      }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
  })

  it('bloqueia 403 EMAIL_DOMAIN_NOT_ALLOWED em mailinator.com', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { email: 'spam@mailinator.com' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'EMAIL_DOMAIN_NOT_ALLOWED',
        }),
      })
    )
  })

  it('é case-insensitive no domínio', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { email: 'spam@MAILINATOR.com' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
  })

  it('considera apenas a parte após o último @ (handles user+tag@domain)', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email',
        body: { email: 'user+tag@mailinator.com' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
  })

  it('preserva path matching com query string', async () => {
    const reply = makeReply()
    await tempmailGateHook(
      makeRequest({
        url: '/api/auth/sign-up/email?ref=campaign',
        body: { email: 'spam@mailinator.com' },
      }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
  })
})
