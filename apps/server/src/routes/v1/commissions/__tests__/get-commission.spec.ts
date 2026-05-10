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
import { getCommissionRoute } from '../get-commission.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getCommissionRoute)
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
  status: 'PENDING_COMMERCIAL',
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

describe('GET /api/v1/commissions/:id', () => {
  it('returns 200 with commission detail', async () => {
    mockExecute.mockResolvedValue(makeCommission())
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions/commission-id-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('commission-id-001')
    expect(body.data.commissionValueInCents).toBe(150000)
  })
  it('calls use case with correct id and organizationId', async () => {
    mockExecute.mockResolvedValue(makeCommission())
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions/commission-id-001',
    })
    expect(mockExecute).toHaveBeenCalledWith('commission-id-001', TEST_ORG_ID)
  })
  it('returns 404 when commission does not exist', async () => {
    mockResolveError('COMMISSION_NOT_FOUND', 'Commission not found')
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions/nonexistent-id',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('COMMISSION_NOT_FOUND')
  })
  it('returns commission with optional salesperson and policy info', async () => {
    mockExecute.mockResolvedValue(
      makeCommission({
        salespersonName: 'João Silva',
        policyNumber: 'POL-2026-001',
        clientName: 'Cliente Teste',
      })
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions/commission-id-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.salespersonName).toBe('João Silva')
    expect(body.data.policyNumber).toBe('POL-2026-001')
    expect(body.data.clientName).toBe('Cliente Teste')
  })
})
