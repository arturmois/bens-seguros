import type { FastifyReply, FastifyRequest } from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { requireSuperAdmin } from '../require-super-admin.js'

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

describe('requireSuperAdmin', () => {
  it('responds 401 when request.user is null', async () => {
    const reply = makeReply()

    await requireSuperAdmin(makeRequest(null), reply)

    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
  })

  it('responds 403 when user.isSuperAdmin is not true', async () => {
    const reply = makeReply()

    await requireSuperAdmin(
      makeRequest({ id: 'u1', isSuperAdmin: false }),
      reply
    )

    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    )
  })

  it('passes through when user.isSuperAdmin is true (no reply called)', async () => {
    const reply = makeReply()

    await requireSuperAdmin(
      makeRequest({ id: 'u1', isSuperAdmin: true }),
      reply
    )

    expect(reply.status).not.toHaveBeenCalled()
    expect(reply.send).not.toHaveBeenCalled()
  })
})
