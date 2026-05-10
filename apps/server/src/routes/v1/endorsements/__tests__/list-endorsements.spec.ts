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
import { listEndorsementsRoute } from '../list-endorsements.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listEndorsementsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeEndorsement = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'endorsement-id-001',
  organizationId: TEST_ORG_ID,
  policyId: 'policy-id-001',
  type: 'COVERAGE_CHANGE',
  description: 'Added life coverage',
  effectiveDate: new Date().toISOString(),
  previousVersionSnapshot: {},
  changes: {},
  createdBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('GET /api/v1/endorsements', () => {
  it('returns 200 with paginated endorsement list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeEndorsement()],
      nextCursor: null,
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/endorsements',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].type).toBe('COVERAGE_CHANGE')
    expect(body.meta.nextCursor).toBeNull()
  })
  it('returns 200 with empty list when no endorsements exist', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/endorsements',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
    expect(body.meta.nextCursor).toBeNull()
  })
  it('returns 200 with nextCursor when more pages exist', async () => {
    mockExecute.mockResolvedValue({
      items: [makeEndorsement(), makeEndorsement({ id: 'endorsement-id-002' })],
      nextCursor: 'endorsement-id-002',
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/endorsements',
      query: { limit: '2' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('endorsement-id-002')
  })
  it('returns 200 with filtered results when policyId is provided', async () => {
    mockExecute.mockResolvedValue({
      items: [makeEndorsement()],
      nextCursor: null,
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/endorsements',
      query: { policyId: 'policy-id-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data[0].policyId).toBe('policy-id-001')
  })
  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/endorsements',
      query: { limit: '0' },
    })
    expect(response.statusCode).toBe(400)
  })
})
