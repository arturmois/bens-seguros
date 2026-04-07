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
import { getClaimRoute } from '../get-claim.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getClaimRoute)
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

describe('GET /api/v1/claims/:id', () => {
  it('returns 200 with claim detail for existing id', async () => {
    mockExecute.mockResolvedValue(makeClaim())

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/claim-id-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('claim-id-001')
    expect(body.data.claimNumber).toBe(1001)
    expect(body.data.status).toBe('REGISTERED')
  })

  it('calls use case with correct id and organizationId', async () => {
    mockExecute.mockResolvedValue(makeClaim())

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/claim-id-001',
    })

    expect(mockExecute).toHaveBeenCalledWith('claim-id-001', TEST_ORG_ID)
  })

  it('returns 404 when claim does not exist', async () => {
    mockResolveError('CLAIM_NOT_FOUND', 'Claim not found')

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/nonexistent-id',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLAIM_NOT_FOUND')
  })

  it('returns optional enriched fields when present', async () => {
    mockExecute.mockResolvedValue(
      makeClaim({
        policyNumber: 'POL-001',
        clientName: 'João Silva',
        insurerName: 'Seguradora ABC',
      })
    )

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/claim-id-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.clientName).toBe('João Silva')
    expect(body.data.insurerName).toBe('Seguradora ABC')
  })
})
