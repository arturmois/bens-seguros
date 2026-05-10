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
import { listClaimsRoute } from '../list-claims.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listClaimsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeClaim = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'claim-id-001',
  organizationId: TEST_ORG_ID,
  claimNumber: 1001,
  policyId: 'policy-id-001',
  clientId: 'client-id-001',
  insurerId: null,
  assignedToId: null,
  status: 'REGISTERED',
  priority: 'NORMAL',
  description: 'Acidente de trânsito',
  estimatedValueInCents: null,
  incidentDate: null,
  incidentLocation: null,
  reportedAt: new Date(),
  resolvedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('GET /api/v1/claims', () => {
  it('returns 200 with paginated claims list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeClaim()],
      total: 1,
      nextCursor: null,
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].claimNumber).toBe(1001)
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })
  it('returns 200 with empty list when no claims exist', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims',
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
      url: '/api/v1/claims',
      query: { status: 'IN_ANALYSIS' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'IN_ANALYSIS' }),
      expect.any(Object)
    )
  })
  it('passes priority and search filters to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims',
      query: { priority: 'URGENT', search: 'acidente' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'URGENT', search: 'acidente' }),
      expect.any(Object)
    )
  })
  it('passes sorting params to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims',
      query: { sortBy: 'priority', sortOrder: 'asc' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ sortBy: 'priority', sortOrder: 'asc' })
    )
  })
  it('returns 400 when status has invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims',
      query: { status: 'INVALID_STATUS' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('parses statusIn from CSV query', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims?statusIn=IN_ANALYSIS,APPROVED',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ statusIn: ['IN_ANALYSIS', 'APPROVED'] }),
      expect.anything()
    )
  })
  it('parses priorityIn from CSV query', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims?priorityIn=HIGH,URGENT',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ priorityIn: ['HIGH', 'URGENT'] }),
      expect.anything()
    )
  })
  it('returns 400 when priorityIn has an invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims?priorityIn=HIGH,INVALID',
    })
    expect(response.statusCode).toBe(400)
  })
})
