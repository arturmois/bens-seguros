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
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { payCommissionRoute } from '../pay-commission.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(payCommissionRoute)
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
  status: 'PAID',
  commissionValueInCents: 150000,
  premiumValueInCents: 1000000,
  percentageInBasisPoints: 1500,
  splitPercentage: null,
  approvedBy: 'user-admin-001',
  approvedAt: new Date(),
  paidAt: new Date(),
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

describe('POST /api/v1/commissions/:id/pay', () => {
  it('returns 200 with commission marked as PAID', async () => {
    mockExecute.mockResolvedValue(makeCommission())
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/pay',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('PAID')
    expect(body.data.paidAt).not.toBeNull()
  })
  it('calls use case with correct id and organizationId', async () => {
    mockExecute.mockResolvedValue(makeCommission())
    await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/pay',
    })
    expect(mockExecute).toHaveBeenCalledWith('commission-id-001', TEST_ORG_ID)
  })
  it('returns 422 when commission transition is invalid', async () => {
    mockResolveError(
      'INVALID_COMMISSION_TRANSITION',
      'Invalid commission transition'
    )
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/pay',
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INVALID_COMMISSION_TRANSITION')
  })
  it('returns 422 when commission is not in paid state', async () => {
    mockResolveError('COMMISSION_NOT_PAID', 'Commission is not in paid state')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/pay',
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('COMMISSION_NOT_PAID')
  })
  it('returns 404 when commission does not exist', async () => {
    mockResolveError('COMMISSION_NOT_FOUND', 'Commission not found')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/nonexistent-id/pay',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('COMMISSION_NOT_FOUND')
  })
})
