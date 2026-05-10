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
import { makeAuditLog } from '../../../../__tests__/helpers/factories.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listAuditLogsRoute } from '../list-audit-logs.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listAuditLogsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/audit-logs', () => {
  it('returns 200 with paginated audit log list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeAuditLog()],
      total: 1,
      nextCursor: null,
    })
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
    const items = Array.from({ length: 30 }, (_, i) =>
      makeAuditLog({ id: `audit-id-${String(i).padStart(3, '0')}` })
    )
    mockExecute.mockResolvedValue({
      items,
      total: 50,
      nextCursor: 'audit-id-029',
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
      query: { limit: '30' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('audit-id-029')
    expect(body.data).toHaveLength(30)
  })
  it('passes entityType filter to the use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
      query: { entityType: 'Client' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        entityType: 'Client',
      }),
      expect.anything()
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
  it('parses entityTypeIn from CSV query', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs?entityTypeIn=Client,Proposal',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTypeIn: ['Client', 'Proposal'],
      }),
      expect.anything()
    )
  })
  it('parses actionIn from CSV query', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs?actionIn=CREATE,UPDATE',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        actionIn: ['CREATE', 'UPDATE'],
      }),
      expect.anything()
    )
  })
  it('passes pagination params to the use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
      query: { limit: '15', cursor: 'audit-id-100' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 15, cursor: 'audit-id-100' })
    )
  })
  it('converts dateFrom and dateTo strings to Date before reaching the use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
      query: {
        dateFrom: '2026-05-01T00:00:00.000Z',
        dateTo: '2026-05-09T23:59:59.999Z',
      },
    })
    const filters = mockExecute.mock.calls[0]?.[0] as {
      dateFrom: unknown
      dateTo: unknown
    }
    expect(filters.dateFrom).toBeInstanceOf(Date)
    expect(filters.dateTo).toBeInstanceOf(Date)
    expect((filters.dateFrom as Date).toISOString()).toBe(
      '2026-05-01T00:00:00.000Z'
    )
    expect((filters.dateTo as Date).toISOString()).toBe(
      '2026-05-09T23:59:59.999Z'
    )
  })
  it('leaves dateFrom and dateTo undefined when not provided', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
    })
    const filters = mockExecute.mock.calls[0]?.[0] as {
      dateFrom: unknown
      dateTo: unknown
    }
    expect(filters.dateFrom).toBeUndefined()
    expect(filters.dateTo).toBeUndefined()
  })
})
