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
import { cancelPolicyRoute } from '../cancel-policy.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(cancelPolicyRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makePolicy = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'policy-id-001',
  organizationId: TEST_ORG_ID,
  proposalId: 'proposal-id-001',
  clientId: 'client-id-001',
  salespersonId: 'user-id-001',
  policyNumber: 'POL-2026-001',
  status: 'CANCELLED',
  branch: 'AUTO',
  premiumValueInCents: 150000,
  coverageDetails: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2027-01-01'),
  cancelledAt: new Date(),
  cancelReason: 'Cliente solicitou cancelamento',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('POST /api/v1/policies/:id/cancel', () => {
  it('returns 200 with cancelled policy', async () => {
    mockExecute.mockResolvedValue(makePolicy())
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/cancel',
      payload: { reason: 'Cliente solicitou cancelamento' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('CANCELLED')
    expect(body.data.cancelReason).toBe('Cliente solicitou cancelamento')
  })
  it('calls use case with id, organizationId and reason', async () => {
    mockExecute.mockResolvedValue(makePolicy())
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/cancel',
      payload: { reason: 'Sinistro total' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      'policy-id-001',
      TEST_ORG_ID,
      'Sinistro total'
    )
  })
  it('returns 404 when policy does not exist', async () => {
    mockResolveError('POLICY_NOT_FOUND', 'Policy not found')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies/nonexistent-id/cancel',
      payload: { reason: 'Cancelamento' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('POLICY_NOT_FOUND')
  })
  it('returns 409 when policy is already cancelled', async () => {
    mockResolveError('POLICY_ALREADY_CANCELLED', 'Policy is already cancelled')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/cancel',
      payload: { reason: 'Cancelamento' },
    })
    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.error.code).toBe('POLICY_ALREADY_CANCELLED')
  })
  it('returns 400 when reason is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/policies/policy-id-001/cancel',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })
})
