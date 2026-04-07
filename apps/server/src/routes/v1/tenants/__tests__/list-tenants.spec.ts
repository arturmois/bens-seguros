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
import { makeTenantMember } from '../../../../__tests__/helpers/factories.js'
import { listTenantsRoute } from '../list-tenants.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      member: {
        findMany: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listTenantsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/tenants', () => {
  it('returns 200 with tenant list for authenticated user', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      makeTenantMember(),
    ] as unknown as Awaited<ReturnType<typeof prisma.member.findMany>>)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/tenants',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe(TEST_ORG_ID)
    expect(body.data[0].role).toBe('OWNER')
    expect(vi.mocked(prisma.member.findMany)).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, active: true },
      include: { organization: true },
    })
  })

  it('returns 200 with empty list when user has no memberships', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.member.findMany).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof prisma.member.findMany>>
    )

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/tenants',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
  })

  it('returns 401 when user context is missing', async () => {
    setTestContext({ user: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/tenants',
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })
})
