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
import { reverseCommissionRoute } from '../reverse-commission.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(reverseCommissionRoute)
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
  status: 'REVERSED',
  commissionValueInCents: 150000,
  premiumValueInCents: 1000000,
  percentageInBasisPoints: 1500,
  splitPercentage: null,
  approvedBy: null,
  approvedAt: null,
  paidAt: null,
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

describe('POST /api/v1/commissions/:id/reverse', () => {
  it('returns 201 with reversal and original commission', async () => {
    const original = makeCommission({ status: 'REVERSED' })
    const reversal = makeCommission({
      id: 'commission-id-002',
      isReversal: true,
      originalCommissionId: 'commission-id-001',
      commissionValueInCents: -150000,
    })
    mockExecute.mockResolvedValue({ reversal, original })
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reverse',
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.reversal.isReversal).toBe(true)
    expect(body.data.original.status).toBe('REVERSED')
  })
  it('calls use case with correct id and organizationId', async () => {
    const original = makeCommission()
    const reversal = makeCommission({
      id: 'commission-id-002',
      isReversal: true,
    })
    mockExecute.mockResolvedValue({ reversal, original })
    await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reverse',
    })
    expect(mockExecute).toHaveBeenCalledWith('commission-id-001', TEST_ORG_ID)
  })
  it('returns 409 when commission is already paid', async () => {
    mockResolveError('COMMISSION_ALREADY_PAID', 'Commission is already paid')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/commission-id-001/reverse',
    })
    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('COMMISSION_ALREADY_PAID')
  })
  it('returns 404 when commission does not exist', async () => {
    mockResolveError('COMMISSION_NOT_FOUND', 'Commission not found')
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/commissions/nonexistent-id/reverse',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('COMMISSION_NOT_FOUND')
  })
})
