import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import {
  createTestApp,
  injectAs,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { getPublicInvitationRoute } from '../get-public-invitation.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      invitation: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getPublicInvitationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
})

const makeInvitation = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'invite-id-001',
  organizationId: TEST_ORG_ID,
  email: 'invited@user.com',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  inviterId: 'inviter-user-id',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  organization: { name: 'Corretora Exemplo' },
  ...overrides,
})

describe('GET /api/v1/invitations/:id/public', () => {
  it('returns 200 with public invitation data (no auth required)', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(
      makeInvitation() as never
    )
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ name: 'Inviter Name' } as never) // inviter
      .mockResolvedValueOnce(null) // existing user check

    const response = await injectAs(app, {
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
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(
      makeInvitation() as never
    )
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ name: 'Inviter Name' } as never) // inviter
      .mockResolvedValueOnce({ id: 'existing-user-id' } as never) // existing user

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations/invite-id-001/public',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.hasAccount).toBe(true)
  })

  it('returns fallback inviterName when inviter user is not found', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(
      makeInvitation() as never
    )
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null) // inviter not found
      .mockResolvedValueOnce(null) // no existing user

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations/invite-id-001/public',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.inviterName).toBe('Um membro')
  })

  it('returns 404 when invitation is not found', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations/nonexistent-id/public',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVITATION_NOT_FOUND')
  })
})
