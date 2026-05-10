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
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  makePublicInvitation,
  makeMinimalUser,
} from '../../../../__tests__/helpers/factories.js'
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

describe('GET /api/v1/invitations/:id/public', () => {
  it('returns 200 with public invitation data (no auth required)', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findUnique).mockResolvedValue(
      makePublicInvitation() as unknown as Awaited<
        ReturnType<typeof prisma.invitation.findUnique>
      >
    )
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(
        makeMinimalUser({ name: 'Inviter Name' }) as unknown as Awaited<
          ReturnType<typeof prisma.user.findUnique>
        >
      )
      .mockResolvedValueOnce(null)
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
      makePublicInvitation() as unknown as Awaited<
        ReturnType<typeof prisma.invitation.findUnique>
      >
    )
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(
        makeMinimalUser({ name: 'Inviter Name' }) as unknown as Awaited<
          ReturnType<typeof prisma.user.findUnique>
        >
      )
      .mockResolvedValueOnce(
        makeMinimalUser({ id: 'existing-user-id' }) as unknown as Awaited<
          ReturnType<typeof prisma.user.findUnique>
        >
      )
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
      makePublicInvitation() as unknown as Awaited<
        ReturnType<typeof prisma.invitation.findUnique>
      >
    )
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
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
