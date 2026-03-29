import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tenantMiddleware } from '../tenant-middleware.js'

vi.mock('@repo/db', () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
    },
  },
  createTenantClient: vi.fn(() => ({})),
}))

import { prisma, createTenantClient } from '@repo/db'

function mockRequest(overrides = {}) {
  return {
    session: null,
    user: null,
    organizationId: undefined,
    role: undefined,
    tenantPrisma: undefined,
    ...overrides,
  }
}

function mockReply() {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
}

describe('tenantMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when no active organization in session', async () => {
    const request = mockRequest({ session: { activeOrganizationId: null } })
    const reply = mockReply()

    await tenantMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NO_ORGANIZATION' }),
      })
    )
  })

  it('returns 400 when session is null', async () => {
    const request = mockRequest({ session: null })
    const reply = mockReply()

    await tenantMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'NO_ORGANIZATION' }),
      })
    )
  })

  it('returns 401 when user is not authenticated', async () => {
    const request = mockRequest({
      session: { activeOrganizationId: 'org-1' },
      user: null,
    })
    const reply = mockReply()

    await tenantMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    )
  })

  it('returns 403 when user is not a member of the organization', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null)

    const request = mockRequest({
      session: { activeOrganizationId: 'org-1' },
      user: { id: 'user-1' },
    })
    const reply = mockReply()

    await tenantMiddleware(request as never, reply as never)

    expect(prisma.member.findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: {
          organizationId: 'org-1',
          userId: 'user-1',
        },
      },
    })
    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    )
  })

  it('returns 403 when member is inactive', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      active: false,
      role: 'ADMIN',
    } as never)

    const request = mockRequest({
      session: { activeOrganizationId: 'org-1' },
      user: { id: 'user-1' },
    })
    const reply = mockReply()

    await tenantMiddleware(request as never, reply as never)

    expect(reply.status).toHaveBeenCalledWith(403)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    )
  })

  it('sets organizationId and role on request when member is valid', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      active: true,
      role: 'ADMIN',
    } as never)

    const request = mockRequest({
      session: { activeOrganizationId: 'org-1' },
      user: { id: 'user-1' },
    })
    const reply = mockReply()

    await tenantMiddleware(request as never, reply as never)

    expect(request.organizationId).toBe('org-1')
    expect(request.role).toBe('ADMIN')
    expect(reply.status).not.toHaveBeenCalled()
    expect(reply.send).not.toHaveBeenCalled()
  })

  it('calls createTenantClient with the organizationId when member is valid', async () => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      active: true,
      role: 'OWNER',
    } as never)

    const tenantPrismaInstance = { fake: 'prisma' }
    vi.mocked(createTenantClient).mockReturnValue(tenantPrismaInstance as never)

    const request = mockRequest({
      session: { activeOrganizationId: 'org-42' },
      user: { id: 'user-2' },
    })
    const reply = mockReply()

    await tenantMiddleware(request as never, reply as never)

    expect(createTenantClient).toHaveBeenCalledWith('org-42')
    expect(request.tenantPrisma).toBe(tenantPrismaInstance)
  })
})
