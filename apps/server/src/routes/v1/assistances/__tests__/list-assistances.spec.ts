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
import { listAssistancesRoute } from '../list-assistances.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listAssistancesRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeAssistance = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'assistance-id-001',
  organizationId: TEST_ORG_ID,
  policyId: 'policy-id-001',
  clientId: 'client-id-001',
  claimId: null,
  type: 'TOWING',
  status: 'REQUESTED',
  description: null,
  address: null,
  latitude: null,
  longitude: null,
  providerName: null,
  providerPhone: null,
  requestedAt: new Date().toISOString(),
  scheduledAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('GET /api/v1/assistances', () => {
  it('returns 200 with paginated assistance list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeAssistance()],
      total: 1,
      nextCursor: null,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/assistances',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].type).toBe('TOWING')
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with empty list when no assistances exist', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/assistances',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
  })

  it('returns 200 with filtered results when status is provided', async () => {
    mockExecute.mockResolvedValue({
      items: [makeAssistance({ status: 'COMPLETED' })],
      total: 1,
      nextCursor: null,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/assistances',
      query: { status: 'COMPLETED' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data[0].status).toBe('COMPLETED')
  })

  it('returns 400 when status has an invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/assistances',
      query: { status: 'INVALID_STATUS' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/assistances',
      query: { limit: '0' },
    })

    expect(response.statusCode).toBe(400)
  })
})
