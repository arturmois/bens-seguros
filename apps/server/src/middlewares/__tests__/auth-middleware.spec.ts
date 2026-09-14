import type { Auth } from '@repo/auth'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const findUniqueMock = vi.fn()

vi.mock('@repo/db', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}))

const { createAuthMiddleware } = await import('../auth-middleware.js')

const getSession = vi.fn()
const authMiddleware = createAuthMiddleware({
  api: { getSession },
} as unknown as Auth)

const sessionUser = {
  id: 'user-1',
  email: 'ana@corretora.com',
  name: 'Ana',
  emailVerified: true,
  image: null,
}
const sessionRecord = { id: 'session-1', activeOrganizationId: 'org-1' }

interface TestRequest {
  headers: Record<string, string | string[] | undefined>
  user?: unknown
  session?: unknown
}

function makeRequest(
  headers: TestRequest['headers'] = { cookie: 'session=abc' }
): TestRequest {
  return { headers }
}

function makeReply() {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
}

async function run(request: TestRequest, reply = makeReply()) {
  await authMiddleware(
    request as unknown as FastifyRequest,
    reply as unknown as FastifyReply
  )
  return reply
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('replies 401 UNAUTHORIZED without querying the user when there is no session', async () => {
    getSession.mockResolvedValue(null)
    const request = makeRequest()
    const reply = await run(request)
    expect(reply.status).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
    expect(findUniqueMock).not.toHaveBeenCalled()
    expect(request.user).toBeUndefined()
  })

  it('looks up isSuperAdmin by the session user id', async () => {
    getSession.mockResolvedValue({ user: sessionUser, session: sessionRecord })
    findUniqueMock.mockResolvedValue({ isSuperAdmin: false })
    await run(makeRequest())
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { isSuperAdmin: true },
    })
  })

  it('builds request.user from the session and sets request.session', async () => {
    getSession.mockResolvedValue({ user: sessionUser, session: sessionRecord })
    findUniqueMock.mockResolvedValue({ isSuperAdmin: true })
    const request = makeRequest()
    const reply = await run(request)
    expect(request.user).toEqual({
      id: 'user-1',
      email: 'ana@corretora.com',
      name: 'Ana',
      emailVerified: true,
      image: null,
      isSuperAdmin: true,
    })
    expect(request.session).toBe(sessionRecord)
    expect(reply.status).not.toHaveBeenCalled()
  })

  it.each([
    ['the user row is missing', null],
    ['isSuperAdmin is false', { isSuperAdmin: false }],
  ])('sets isSuperAdmin false when %s', async (_label, row) => {
    getSession.mockResolvedValue({ user: sessionUser, session: sessionRecord })
    findUniqueMock.mockResolvedValue(row)
    const request = makeRequest()
    await run(request)
    expect(request.user).toMatchObject({ isSuperAdmin: false })
  })

  it('passes string headers through and joins array headers with ", "', async () => {
    getSession.mockResolvedValue(null)
    await run(
      makeRequest({
        cookie: 'session=abc',
        'x-forwarded-for': ['10.0.0.1', '10.0.0.2'],
        'x-empty': undefined,
      })
    )
    expect(getSession).toHaveBeenCalledWith({
      headers: {
        cookie: 'session=abc',
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      },
    })
  })
})
