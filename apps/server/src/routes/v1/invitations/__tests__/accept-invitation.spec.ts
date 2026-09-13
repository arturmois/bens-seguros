import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { container, InvitationExpiredError } from '@repo/core'
import type { Auth } from '@repo/auth'
import type { FastifyInstance } from 'fastify'
import {
  createTestApp,
  injectAs,
} from '../../../../__tests__/helpers/create-test-app.js'
import { acceptInvitationRoute } from '../accept-invitation.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      user: { update: vi.fn() },
    },
  }
})

const mockAuth = {
  api: {
    signUpEmail: vi.fn(),
    signInEmail: vi.fn(),
    setActiveOrganization: vi.fn(),
    getSession: vi.fn(),
  },
}

const mockInvitationRepo = {
  findById: vi.fn(),
}

const mockAcceptUseCase = {
  execute: vi.fn(),
}

function registerRoute(app: FastifyInstance) {
  return acceptInvitationRoute(app, mockAuth as unknown as Auth)
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(registerRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (token === 'InvitationRepository') return mockInvitationRepo
    if (typeof token === 'function') return mockAcceptUseCase
    return null
  })
})

const validInvitation = {
  id: 'invite-id-001',
  status: 'pending',
  email: 'invited@user.com',
}

function makeSetCookieHeaders(cookies: string[] = []) {
  return { getSetCookie: vi.fn().mockReturnValue(cookies) }
}

function mockSuccessfulSignIn() {
  mockAuth.api.signInEmail.mockResolvedValue({
    response: { user: { id: 'user-id-001' } },
    headers: makeSetCookieHeaders(['session=abc; Path=/; HttpOnly']),
  })
  mockAcceptUseCase.execute.mockResolvedValue({
    organizationId: 'org-id-001',
    role: 'COMMERCIAL',
  })
  mockAuth.api.setActiveOrganization.mockResolvedValue({
    headers: makeSetCookieHeaders(),
  })
}

describe('POST /api/v1/invitations/:id/accept — invitation lookup', () => {
  it('returns 404 when invitation is not found', async () => {
    mockInvitationRepo.findById.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/nonexistent-id/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('INVITATION_NOT_FOUND')
  })
  it('returns 404 when invitation is canceled', async () => {
    mockInvitationRepo.findById.mockResolvedValue({
      ...validInvitation,
      status: 'canceled',
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('INVITATION_NOT_FOUND')
  })
})
describe('POST /api/v1/invitations/:id/accept — body validation', () => {
  it('rejects missing body with error status', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
  it('rejects invalid discriminated union mode', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'oauth' },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
  it('rejects register mode with missing name', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', password: 'Senha@123' },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /api/v1/invitations/:id/accept — login mode', () => {
  it('returns 200 on successful login', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockSuccessfulSignIn()
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.organizationId).toBe('org-id-001')
    expect(body.data.role).toBe('COMMERCIAL')
  })
  it('returns 401 INVALID_CREDENTIALS when Better Auth returns INVALID_PASSWORD', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signInEmail.mockResolvedValue({
      response: { error: { code: 'INVALID_PASSWORD' } },
      headers: makeSetCookieHeaders(),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'wrong' },
    })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('INVALID_CREDENTIALS')
  })
  it('returns 403 EMAIL_NOT_VERIFIED when Better Auth returns EMAIL_NOT_VERIFIED', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signInEmail.mockResolvedValue({
      response: { error: { code: 'EMAIL_NOT_VERIFIED' } },
      headers: makeSetCookieHeaders(),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('EMAIL_NOT_VERIFIED')
  })
})
describe('POST /api/v1/invitations/:id/accept — register mode', () => {
  it('returns 200 on successful register, marks emailVerified, then signs in', async () => {
    const { prisma } = await import('@repo/db')
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signUpEmail.mockResolvedValue({
      response: { user: { id: 'user-id-002' } },
      headers: makeSetCookieHeaders(),
    })
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    mockSuccessfulSignIn()
    mockAuth.api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-id-002' } },
      headers: makeSetCookieHeaders(['session=abc']),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', name: 'Daisy', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id-002' },
      data: { emailVerified: true },
    })
  })
  it('returns 409 EMAIL_ALREADY_EXISTS when Better Auth returns USER_ALREADY_EXISTS', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signUpEmail.mockResolvedValue({
      response: { error: { code: 'USER_ALREADY_EXISTS' } },
      headers: makeSetCookieHeaders(),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', name: 'Daisy', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('EMAIL_ALREADY_EXISTS')
  })
  it('returns 422 WEAK_PASSWORD when Better Auth returns INVALID_PASSWORD', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signUpEmail.mockResolvedValue({
      response: { error: { code: 'INVALID_PASSWORD' } },
      headers: makeSetCookieHeaders(),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', name: 'Daisy', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json().error.code).toBe('WEAK_PASSWORD')
  })
  it('returns 422 REGISTRATION_FAILED when signUpEmail throws an unexpected error', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signUpEmail.mockRejectedValue(new Error('network down'))
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', name: 'Daisy', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(422)
    expect(response.json().error.code).toBe('REGISTRATION_FAILED')
  })
})
describe('POST /api/v1/invitations/:id/accept — current-session mode', () => {
  it('returns 200 when session email matches invitation email', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.getSession.mockResolvedValue({
      user: { id: 'user-id-003', email: 'invited@user.com' },
    })
    mockAcceptUseCase.execute.mockResolvedValue({
      organizationId: 'org-id-001',
      role: 'COMMERCIAL',
    })
    mockAuth.api.setActiveOrganization.mockResolvedValue({
      headers: makeSetCookieHeaders(),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'current-session' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.organizationId).toBe('org-id-001')
    expect(mockAuth.api.signUpEmail).not.toHaveBeenCalled()
    expect(mockAuth.api.signInEmail).not.toHaveBeenCalled()
  })
  it('returns 401 NO_SESSION when user is not logged in', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.getSession.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'current-session' },
    })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('NO_SESSION')
  })
  it('returns 403 SESSION_EMAIL_MISMATCH when session belongs to a different user', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.getSession.mockResolvedValue({
      user: { id: 'user-id-other', email: 'someone-else@user.com' },
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'current-session' },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('SESSION_EMAIL_MISMATCH')
  })
})

function setCookiesOf(headers: Record<string, unknown>): string[] {
  const raw = headers['set-cookie']
  if (raw === undefined) return []
  return Array.isArray(raw) ? raw.map(String) : [String(raw)]
}

function forwardedCookie(call: unknown): string | null {
  if (call && typeof call === 'object' && 'headers' in call) {
    const { headers } = call
    if (headers instanceof Headers) return headers.get('cookie')
  }
  return null
}

const ACTIVE_ORG_COOKIE = 'active_org=org-id-001; Path=/'

describe('POST /api/v1/invitations/:id/accept — cookie forwarding', () => {
  it('login: responds with sign-in cookie followed by active-org cookie', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockSuccessfulSignIn()
    mockAuth.api.setActiveOrganization.mockResolvedValue({
      headers: makeSetCookieHeaders([ACTIVE_ORG_COOKIE]),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(200)
    expect(setCookiesOf(response.headers)).toEqual([
      'session=abc; Path=/; HttpOnly',
      ACTIVE_ORG_COOKIE,
    ])
  })
  it('register: responds with sign-in cookie followed by active-org cookie', async () => {
    const { prisma } = await import('@repo/db')
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signUpEmail.mockResolvedValue({
      response: { user: { id: 'user-id-002' } },
      headers: makeSetCookieHeaders(['signup=ignored; Path=/']),
    })
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    mockSuccessfulSignIn()
    mockAuth.api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-id-002' } },
      headers: makeSetCookieHeaders(['session=reg; Path=/']),
    })
    mockAuth.api.setActiveOrganization.mockResolvedValue({
      headers: makeSetCookieHeaders([ACTIVE_ORG_COOKIE]),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', name: 'Daisy', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(200)
    expect(setCookiesOf(response.headers)).toEqual([
      'session=reg; Path=/',
      ACTIVE_ORG_COOKIE,
    ])
  })
  it('current-session: responds with only the active-org cookie', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.getSession.mockResolvedValue({
      user: { id: 'user-id-003', email: 'invited@user.com' },
    })
    mockAcceptUseCase.execute.mockResolvedValue({
      organizationId: 'org-id-001',
      role: 'COMMERCIAL',
    })
    mockAuth.api.setActiveOrganization.mockResolvedValue({
      headers: makeSetCookieHeaders([ACTIVE_ORG_COOKIE]),
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'current-session' },
    })
    expect(response.statusCode).toBe(200)
    expect(setCookiesOf(response.headers)).toEqual([ACTIVE_ORG_COOKIE])
  })
  it('forwards the sign-in cookies to setActiveOrganization joined by "; "', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockSuccessfulSignIn()
    mockAuth.api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-id-001' } },
      headers: makeSetCookieHeaders([
        'session=abc; Path=/; HttpOnly',
        'csrf=xyz; Path=/',
      ]),
    })
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })
    expect(mockAuth.api.setActiveOrganization).toHaveBeenCalledTimes(1)
    const call: unknown = mockAuth.api.setActiveOrganization.mock.calls[0]?.[0]
    expect(call).toMatchObject({ body: { organizationId: 'org-id-001' } })
    expect(forwardedCookie(call)).toBe(
      'session=abc; Path=/; HttpOnly; csrf=xyz; Path=/'
    )
  })
  it('still responds 200 with only auth cookies when setActiveOrganization throws', async () => {
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockSuccessfulSignIn()
    mockAuth.api.setActiveOrganization.mockRejectedValue(new Error('boom'))
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      success: true,
      data: { organizationId: 'org-id-001', role: 'COMMERCIAL' },
    })
    expect(setCookiesOf(response.headers)).toEqual([
      'session=abc; Path=/; HttpOnly',
    ])
  })
  it('expired invitation after register: 400 INVITATION_EXPIRED keeps the sign-in cookie', async () => {
    const { prisma } = await import('@repo/db')
    mockInvitationRepo.findById.mockResolvedValue(validInvitation)
    mockAuth.api.signUpEmail.mockResolvedValue({
      response: { user: { id: 'user-id-002' } },
      headers: makeSetCookieHeaders(),
    })
    vi.mocked(prisma.user.update).mockResolvedValue({} as never)
    mockAuth.api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-id-002' } },
      headers: makeSetCookieHeaders(['session=reg; Path=/']),
    })
    mockAcceptUseCase.execute.mockRejectedValue(
      new InvitationExpiredError('invite-id-001')
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', name: 'Daisy', password: 'Senha@123' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('INVITATION_EXPIRED')
    expect(setCookiesOf(response.headers)).toEqual(['session=reg; Path=/'])
    expect(mockAuth.api.setActiveOrganization).not.toHaveBeenCalled()
  })
})
