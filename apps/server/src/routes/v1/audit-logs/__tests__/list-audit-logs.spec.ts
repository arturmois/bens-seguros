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
import { listAuditLogsRoute } from '../list-audit-logs.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      auditLog: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listAuditLogsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const makeAuditLog = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'audit-id-001',
  organizationId: TEST_ORG_ID,
  userId: 'user-id-001',
  action: 'CREATE',
  entityType: 'Client',
  entityId: 'client-id-001',
  before: null,
  after: null,
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  createdAt: new Date(),
  ...overrides,
})

describe('GET /api/v1/audit-logs', () => {
  it('returns 200 with paginated audit log list', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      makeAuditLog(),
    ] as never)
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1 as never)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].action).toBe('CREATE')
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with nextCursor when more pages exist', async () => {
    const logs = Array.from({ length: 31 }, (_, i) =>
      makeAuditLog({ id: `audit-id-${String(i).padStart(3, '0')}` })
    )
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs as never)
    vi.mocked(prisma.auditLog.count).mockResolvedValue(50 as never)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
      query: { limit: '30' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).not.toBeNull()
    expect(body.data).toHaveLength(30)
  })

  it('filters by entityType when query param is provided', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0 as never)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
      query: { entityType: 'Client' },
    })

    expect(response.statusCode).toBe(200)
    expect(vi.mocked(prisma.auditLog.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: TEST_ORG_ID,
          entityType: 'Client',
        }),
      })
    )
  })

  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
      query: { limit: '0' },
    })

    expect(response.statusCode).toBe(400)
  })
})
