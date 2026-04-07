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
import { getPolicyRoute } from '../get-policy.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getPolicyRoute)
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
  status: 'ACTIVE',
  branch: 'AUTO',
  premiumValueInCents: 150000,
  coverageDetails: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2027-01-01'),
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('GET /api/v1/policies/:id', () => {
  it('returns 200 with policy data on valid id', async () => {
    mockExecute.mockResolvedValue(makePolicy())

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies/policy-id-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('policy-id-001')
    expect(body.data.policyNumber).toBe('POL-2026-001')
  })

  it('calls use case with id and organizationId', async () => {
    mockExecute.mockResolvedValue(makePolicy())

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies/policy-id-001',
    })

    expect(mockExecute).toHaveBeenCalledWith('policy-id-001', TEST_ORG_ID)
  })

  it('returns 404 when policy does not exist', async () => {
    mockResolveError('POLICY_NOT_FOUND', 'Policy not found')

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies/nonexistent-id',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('POLICY_NOT_FOUND')
  })

  it('returns policy with optional relational fields when present', async () => {
    mockExecute.mockResolvedValue(
      makePolicy({
        clientName: 'João Silva',
        insurerName: 'Porto Seguro',
        salespersonName: 'Vendedor Test',
      })
    )

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies/policy-id-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.clientName).toBe('João Silva')
    expect(body.data.insurerName).toBe('Porto Seguro')
  })
})
