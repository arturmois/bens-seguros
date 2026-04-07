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
import { listMembersRoute } from '../list-members.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      member: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listMembersRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const makeMember = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'member-id-001',
  userId: TEST_USER_ID,
  organizationId: TEST_ORG_ID,
  role: 'OWNER',
  active: true,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  user: { name: 'Test User', email: 'test@user.com' },
  ...overrides,
})

describe('GET /api/v1/members', () => {
  it('returns 200 with paginated member list', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findMany).mockResolvedValue([makeMember()] as never)
    vi.mocked(prisma.member.count).mockResolvedValue(1)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].role).toBe('OWNER')
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with empty list when no active members', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.member.count).mockResolvedValue(0)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
    expect(body.meta.total).toBe(0)
  })

  it('returns nextCursor when more pages exist', async () => {
    const { prisma } = await import('@repo/db')
    const members = [
      makeMember({ id: 'member-id-001' }),
      makeMember({ id: 'member-id-002' }),
    ]
    // Return limit+1 items to trigger hasMore logic (default limit=50, we send 2 with limit=1)
    vi.mocked(prisma.member.findMany).mockResolvedValue(members as never)
    vi.mocked(prisma.member.count).mockResolvedValue(2)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
      query: { limit: '1' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('member-id-001')
  })

  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/members',
      query: { limit: '0' },
    })

    expect(response.statusCode).toBe(400)
  })
})
