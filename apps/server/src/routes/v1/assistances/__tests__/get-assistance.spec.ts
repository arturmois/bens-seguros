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
import { getAssistanceRoute } from '../get-assistance.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getAssistanceRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeAssistance = () => ({
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
})

describe('GET /api/v1/assistances/:id', () => {
  it('returns 200 with assistance data on valid id', async () => {
    mockExecute.mockResolvedValue(makeAssistance())
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/assistances/assistance-id-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('assistance-id-001')
    expect(body.data.organizationId).toBe(TEST_ORG_ID)
    expect(body.data.status).toBe('REQUESTED')
  })
  it('returns 404 when assistance is not found', async () => {
    mockResolveError('ASSISTANCE_NOT_FOUND', 'Assistance not found')
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/assistances/nonexistent-id',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ASSISTANCE_NOT_FOUND')
  })
})
