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
import { createClaimRoute } from '../create-claim.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createClaimRoute)
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

const validBody = {
  policyId: 'policy-id-001',
  clientId: 'client-id-001',
  description: 'Acidente de trânsito',
  priority: 'NORMAL',
}

describe('POST /api/v1/claims', () => {
  it('returns 201 with claim detail on valid creation', async () => {
    mockExecute.mockResolvedValue(makeClaim())
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims',
      payload: validBody,
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.claimNumber).toBe(1001)
    expect(body.data.status).toBe('REGISTERED')
    expect(body.data.priority).toBe('NORMAL')
  })
  it('returns 201 with optional fields when provided', async () => {
    mockExecute.mockResolvedValue(
      makeClaim({
        estimatedValueInCents: 500000,
        incidentDate: new Date('2026-01-15'),
        priority: 'HIGH',
      })
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims',
      payload: {
        ...validBody,
        estimatedValueInCents: 500000,
        incidentDate: '2026-01-15',
        priority: 'HIGH',
      },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.data.estimatedValueInCents).toBe(500000)
    expect(body.data.priority).toBe('HIGH')
  })
  it('passes organizationId and notify context to use case', async () => {
    mockExecute.mockResolvedValue(makeClaim())
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims',
      payload: validBody,
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: TEST_ORG_ID }),
      expect.objectContaining({ creatorUserId: expect.any(String) })
    )
  })
  it('returns 400 when required field description is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims',
      payload: { policyId: 'policy-id-001', clientId: 'client-id-001' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when priority has invalid value', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims',
      payload: { ...validBody, priority: 'INVALID_PRIORITY' },
    })
    expect(response.statusCode).toBe(400)
  })
})
