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
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listCommissionsRoute } from '../list-commissions.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listCommissionsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeCommission = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'commission-id-001',
  organizationId: TEST_ORG_ID,
  policyId: 'policy-id-001',
  salespersonId: 'user-id-001',
  status: 'PENDING_COMMERCIAL',
  commissionValueInCents: 150000,
  premiumValueInCents: 1000000,
  percentageInBasisPoints: 1500,
  splitPercentage: null,
  approvedBy: null,
  approvedAt: null,
  paidAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  isReversal: false,
  originalCommissionId: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('GET /api/v1/commissions', () => {
  it('returns 200 with paginated commissions list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeCommission()],
      total: 1,
      nextCursor: null,
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].commissionValueInCents).toBe(150000)
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })
  it('returns 200 with empty list when no commissions exist', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
    expect(body.meta.total).toBe(0)
  })
  it('passes status filter to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions',
      query: { status: 'APPROVED' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED' }),
      expect.any(Object)
    )
  })
  it('passes salespersonId and search filters to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions',
      query: { salespersonId: 'user-id-001', search: 'João' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        salespersonId: 'user-id-001',
        search: 'João',
      }),
      expect.any(Object)
    )
  })
  it('returns 400 when status has invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions',
      query: { status: 'INVALID_STATUS' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('parses statusIn from CSV query', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions?statusIn=APPROVED,PAID',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ statusIn: ['APPROVED', 'PAID'] }),
      expect.any(Object)
    )
  })
  it('returns 400 when statusIn has an invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions?statusIn=APPROVED,INVALID',
    })
    expect(response.statusCode).toBe(400)
  })
})
