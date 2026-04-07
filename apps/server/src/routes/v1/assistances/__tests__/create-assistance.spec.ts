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
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { createAssistanceRoute } from '../create-assistance.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createAssistanceRoute)
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

const validBody = {
  policyId: 'policy-id-001',
  clientId: 'client-id-001',
  type: 'TOWING',
}

describe('POST /api/v1/assistances', () => {
  it('returns 201 with assistance data on valid request', async () => {
    mockExecute.mockResolvedValue(makeAssistance())

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances',
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.organizationId).toBe(TEST_ORG_ID)
    expect(body.data.type).toBe('TOWING')
    expect(body.data.status).toBe('REQUESTED')
  })

  it('returns 400 when policyId is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances',
      payload: { clientId: 'client-id-001', type: 'TOWING' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when clientId is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances',
      payload: { policyId: 'policy-id-001', type: 'TOWING' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when type is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances',
      payload: { policyId: 'policy-id-001', clientId: 'client-id-001' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when policy is not found', async () => {
    mockResolveError('POLICY_NOT_FOUND', 'Policy not found')

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances',
      payload: validBody,
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('POLICY_NOT_FOUND')
  })
})
