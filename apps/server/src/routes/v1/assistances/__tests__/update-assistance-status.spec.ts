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
import { updateAssistanceStatusRoute } from '../update-assistance-status.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateAssistanceStatusRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeAssistance = (
  status = 'COMPLETED',
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: 'assistance-id-001',
  organizationId: TEST_ORG_ID,
  policyId: 'policy-id-001',
  clientId: 'client-id-001',
  claimId: null,
  type: 'TOWING',
  status,
  description: null,
  address: null,
  latitude: null,
  longitude: null,
  providerName: null,
  providerPhone: null,
  requestedAt: new Date().toISOString(),
  scheduledAt: null,
  completedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('POST /api/v1/assistances/:id/status', () => {
  it('returns 200 with updated assistance on valid status transition', async () => {
    mockExecute.mockResolvedValue(makeAssistance('COMPLETED'))
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances/assistance-id-001/status',
      payload: { status: 'COMPLETED' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('COMPLETED')
    expect(body.data.organizationId).toBe(TEST_ORG_ID)
  })
  it('returns 400 when status is invalid', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances/assistance-id-001/status',
      payload: { status: 'INVALID_STATUS' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when status is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances/assistance-id-001/status',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 422 on invalid status transition', async () => {
    mockResolveError(
      'INVALID_ASSISTANCE_STATUS_TRANSITION',
      'Cannot transition to the requested status'
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances/assistance-id-001/status',
      payload: { status: 'REQUESTED' },
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVALID_ASSISTANCE_STATUS_TRANSITION')
  })
  it('returns 404 when assistance is not found', async () => {
    mockResolveError('ASSISTANCE_NOT_FOUND', 'Assistance not found')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/assistances/nonexistent-id/status',
      payload: { status: 'COMPLETED' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('ASSISTANCE_NOT_FOUND')
  })
})
