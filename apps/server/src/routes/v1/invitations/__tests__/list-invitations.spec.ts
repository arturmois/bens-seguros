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
} from '../../../../__tests__/helpers/create-test-app.js'
import { listInvitationsRoute } from '../list-invitations.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      invitation: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listInvitationsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const makeInvitation = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'invite-id-001',
  organizationId: TEST_ORG_ID,
  email: 'invited@user.com',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  inviterId: 'user-id-001',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
})

describe('GET /api/v1/invitations', () => {
  it('returns 200 with pending invitation list', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findMany).mockResolvedValue([
      makeInvitation(),
    ] as never)
    vi.mocked(prisma.invitation.count).mockResolvedValue(1)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].email).toBe('invited@user.com')
    expect(body.data[0].status).toBe('pending')
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with empty list when no pending invitations', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.invitation.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.invitation.count).mockResolvedValue(0)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
    expect(body.meta.total).toBe(0)
  })

  it('returns nextCursor when more pages exist', async () => {
    const { prisma } = await import('@repo/db')
    const invitations = [
      makeInvitation({ id: 'invite-id-001' }),
      makeInvitation({ id: 'invite-id-002' }),
    ]
    vi.mocked(prisma.invitation.findMany).mockResolvedValue(
      invitations as never
    )
    vi.mocked(prisma.invitation.count).mockResolvedValue(2)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
      query: { limit: '1' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('invite-id-001')
  })

  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/invitations',
      query: { limit: '0' },
    })

    expect(response.statusCode).toBe(400)
  })
})
