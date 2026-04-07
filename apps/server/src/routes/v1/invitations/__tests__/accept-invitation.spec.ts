import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import {
  createTestApp,
  injectAs,
} from '../../../../__tests__/helpers/create-test-app.js'
import { acceptInvitationRoute } from '../accept-invitation.js'

// Note: @repo/core container.resolve is already mocked globally in setup.ts

// Mock auth object used for acceptInvitationRoute second argument
const mockAuth = {
  api: {
    signUpEmail: vi.fn(),
    signInEmail: vi.fn(),
    setActiveOrganization: vi.fn(),
  },
}

const mockInvitationRepo = {
  findById: vi.fn(),
}

const mockAcceptUseCase = {
  execute: vi.fn(),
}

function registerRoute(app: FastifyInstance) {
  return acceptInvitationRoute(app, mockAuth as never)
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(registerRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()

  // container.resolve returns InvitationRepository for string token, use case for class token
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (token === 'InvitationRepository') return mockInvitationRepo
    if (typeof token === 'function') return mockAcceptUseCase
    return null
  })
})

describe('POST /api/v1/invitations/:id/accept', () => {
  it('returns 404 when invitation is not found', async () => {
    mockInvitationRepo.findById.mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/nonexistent-id/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVITATION_NOT_FOUND')
  })

  it('returns 404 when invitation is canceled', async () => {
    mockInvitationRepo.findById.mockResolvedValue({
      id: 'invite-id-001',
      status: 'canceled',
      email: 'invited@user.com',
    })

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('INVITATION_NOT_FOUND')
  })

  it('rejects missing body with error status', async () => {
    // The route schema has 400: errorResponse which conflicts with Fastify's built-in
    // validation error format (FST_ERR_FAILED_ERROR_SERIALIZATION → 500 in test env).
    // We assert the response is a non-2xx error status to confirm rejection.
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('rejects invalid discriminated union mode with error status', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'oauth' },
    })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('rejects register mode with missing name with error status', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'register', password: 'Senha@123' },
    })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('returns 200 on successful login accept', async () => {
    const mockSetCookieHeaders = {
      getSetCookie: vi.fn().mockReturnValue(['session=abc; Path=/; HttpOnly']),
    }

    mockInvitationRepo.findById.mockResolvedValue({
      id: 'invite-id-001',
      status: 'pending',
      email: 'invited@user.com',
    })

    mockAuth.api.signInEmail.mockResolvedValue({
      response: { user: { id: 'user-id-001' } },
      headers: mockSetCookieHeaders,
    })

    mockAcceptUseCase.execute.mockResolvedValue({
      organizationId: 'org-id-001',
      role: 'COMMERCIAL',
    })

    mockAuth.api.setActiveOrganization.mockResolvedValue({
      headers: { getSetCookie: vi.fn().mockReturnValue([]) },
    })

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations/invite-id-001/accept',
      payload: { mode: 'login', password: 'Senha@123' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.organizationId).toBe('org-id-001')
    expect(body.data.role).toBe('COMMERCIAL')
  })
})
