import type { Auth } from '@repo/auth'
import type { FastifyInstance } from 'fastify'
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { createTestApp } from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { getPublicInvitationRoute } from '../get-public-invitation.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()

const fakeAuth: Auth = {
  api: {
    getSession: vi.fn().mockResolvedValue(null),
  },
} as unknown as Auth

const baseView = {
  id: 'invite-id-001',
  email: 'invited@user.com',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date('2026-12-31'),
  organizationName: 'Corretora Exemplo',
  inviterName: 'Inviter Name',
  hasAccount: false,
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((app: FastifyInstance) =>
    getPublicInvitationRoute(app, fakeAuth)
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  mockResolve(mockExecute)
})

describe('GET /api/v1/invitations/:id/public', () => {
  it('returns 200 with public invitation data (no auth required)', async () => {
    mockExecute.mockResolvedValue(baseView)
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invitations/invite-id-001/public',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('invite-id-001')
    expect(body.data.email).toBe('invited@user.com')
    expect(body.data.organizationName).toBe('Corretora Exemplo')
    expect(body.data.inviterName).toBe('Inviter Name')
    expect(body.data.hasAccount).toBe(false)
  })
  it('returns 200 with hasAccount true when email already has an account', async () => {
    mockExecute.mockResolvedValue({ ...baseView, hasAccount: true })
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invitations/invite-id-001/public',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.hasAccount).toBe(true)
  })
  it('returns fallback inviterName "Um membro" when inviter is unknown', async () => {
    mockExecute.mockResolvedValue({ ...baseView, inviterName: 'Um membro' })
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invitations/invite-id-001/public',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.inviterName).toBe('Um membro')
  })
  it('returns 404 when invitation is not found', async () => {
    mockResolveError('INVITATION_NOT_FOUND', 'Invitation not found')
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/invitations/nonexistent-id/public',
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('INVITATION_NOT_FOUND')
  })
})
