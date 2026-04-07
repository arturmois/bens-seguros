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
  setTestContext,
  TEST_ORG_ID,
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { createInvitationRoute } from '../create-invitation.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      member: { findFirst: vi.fn() },
      invitation: { findFirst: vi.fn(), create: vi.fn() },
      organization: { findUnique: vi.fn() },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createInvitationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext({ role: 'OWNER' })
})

const makeCreatedInvitation = () => ({
  id: 'invite-id-001',
  organizationId: TEST_ORG_ID,
  email: 'newmember@user.com',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  inviterId: TEST_USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const validBody = { email: 'newmember@user.com', role: 'COMMERCIAL' }

describe('POST /api/v1/invitations', () => {
  it('returns 201 with created invitation on success', async () => {
    const { prisma } = await import('@repo/db')
    // No existing member, no duplicate invitation
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invitation.create).mockResolvedValue(
      makeCreatedInvitation() as never
    )

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.email).toBe('newmember@user.com')
    expect(body.data.role).toBe('COMMERCIAL')
    expect(body.data.status).toBe('pending')
  })

  it('returns 409 when email is already an active member', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findFirst).mockResolvedValue({
      id: 'member-id-001',
    } as never)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: validBody,
    })

    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('DUPLICATE_INVITATION')
  })

  it('returns 409 when there is already a pending invitation for the email', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
      id: 'existing-invite-id',
    } as never)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: validBody,
    })

    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.error.code).toBe('DUPLICATE_INVITATION')
  })

  it('returns 403 when caller tries to invite someone with equal or higher role', async () => {
    // COMMERCIAL (level 2) trying to invite an OWNER (level 5) — violation
    // Use VIEWER role (level 1) trying to invite ADMIN (level 4)
    setTestContext({ role: 'VIEWER' })
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: { email: 'newmember@user.com', role: 'ADMIN' },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json()
    expect(body.error.code).toBe('ROLE_HIERARCHY_VIOLATION')
  })

  it('returns 400 when email is invalid', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/invitations',
      payload: { email: 'not-an-email', role: 'COMMERCIAL' },
    })

    expect(response.statusCode).toBe(400)
  })
})
