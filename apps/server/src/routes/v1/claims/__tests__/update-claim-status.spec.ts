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
import { updateClaimStatusRoute } from '../update-claim-status.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateClaimStatusRoute)
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
  status: 'IN_ANALYSIS',
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

describe('POST /api/v1/claims/:id/status', () => {
  it('returns 200 with updated claim on valid status transition', async () => {
    mockExecute.mockResolvedValue(makeClaim({ status: 'IN_ANALYSIS' }))
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-001/status',
      payload: { status: 'IN_ANALYSIS' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('IN_ANALYSIS')
  })
  it('calls use case with correct id, organizationId and status', async () => {
    mockExecute.mockResolvedValue(makeClaim({ status: 'APPROVED' }))
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-001/status',
      payload: { status: 'APPROVED' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      'claim-id-001',
      TEST_ORG_ID,
      'APPROVED'
    )
  })
  it('returns 422 when status transition is invalid', async () => {
    mockResolveError(
      'INVALID_CLAIM_STATUS_TRANSITION',
      'Invalid status transition'
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-001/status',
      payload: { status: 'PAID' },
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVALID_CLAIM_STATUS_TRANSITION')
  })
  it('returns 404 when claim does not exist', async () => {
    mockResolveError('CLAIM_NOT_FOUND', 'Claim not found')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/nonexistent-id/status',
      payload: { status: 'IN_ANALYSIS' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('CLAIM_NOT_FOUND')
  })
  it('returns 400 when status has invalid value', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-001/status',
      payload: { status: 'INVALID_STATUS' },
    })
    expect(response.statusCode).toBe(400)
  })
})
