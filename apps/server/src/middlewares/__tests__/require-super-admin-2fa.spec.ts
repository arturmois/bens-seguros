import type { FastifyReply, FastifyRequest } from 'fastify'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const findUniqueMock = vi.fn()

vi.mock('@repo/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}))

const { requireSuperAdmin2FA } = await import('../require-super-admin-2fa.js')

function makeReply(): FastifyReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue(undefined),
  }
  return reply as unknown as FastifyReply
}

function makeRequest(user: unknown): FastifyRequest {
  return { user } as unknown as FastifyRequest
}

describe('requireSuperAdmin2FA', () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
  })

  it('responds 401 when request.user is missing', async () => {
    const reply = makeReply()
    await requireSuperAdmin2FA(makeRequest(undefined), reply)
    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('responds 403 with FORBIDDEN when user is not super-admin', async () => {
    const reply = makeReply()
    await requireSuperAdmin2FA(
      makeRequest({ id: 'u1', isSuperAdmin: false }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    )
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it('responds 403 with TWO_FACTOR_REQUIRED when super-admin without 2FA enrolled', async () => {
    findUniqueMock.mockResolvedValueOnce({ twoFactorEnabled: false })
    const reply = makeReply()
    await requireSuperAdmin2FA(
      makeRequest({ id: 'u1', isSuperAdmin: true }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TWO_FACTOR_REQUIRED' }),
      })
    )
  })

  it('responds 403 TWO_FACTOR_REQUIRED when prisma returns null (user deleted mid-session)', async () => {
    findUniqueMock.mockResolvedValueOnce(null)
    const reply = makeReply()
    await requireSuperAdmin2FA(
      makeRequest({ id: 'u1', isSuperAdmin: true }),
      reply
    )
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TWO_FACTOR_REQUIRED' }),
      })
    )
  })

  it('passes through silently when super-admin has 2FA enrolled', async () => {
    findUniqueMock.mockResolvedValueOnce({ twoFactorEnabled: true })
    const reply = makeReply()
    await requireSuperAdmin2FA(
      makeRequest({ id: 'u1', isSuperAdmin: true }),
      reply
    )
    expect(reply.status).not.toHaveBeenCalled()
    expect(reply.send).not.toHaveBeenCalled()
  })

  it('queries prisma using the user id from the request', async () => {
    findUniqueMock.mockResolvedValueOnce({ twoFactorEnabled: true })
    await requireSuperAdmin2FA(
      makeRequest({ id: 'user-123', isSuperAdmin: true }),
      makeReply()
    )
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { twoFactorEnabled: true },
    })
  })
})
