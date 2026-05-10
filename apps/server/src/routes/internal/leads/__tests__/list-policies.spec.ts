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
import { listInternalPoliciesRoute } from '../list-policies.js'

const mockTenantPrisma = {
  contact: {
    findFirst: vi.fn(),
  },
  policy: {
    findMany: vi.fn(),
  },
}

vi.mock('@repo/db/tenant', () => ({
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))

let app: Awaited<ReturnType<typeof createTestApp>>

const makePolicy = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'policy-001',
  organizationId: TEST_ORG_ID,
  clientId: 'client-001',
  policyNumber: 12345,
  branch: 'AUTO',
  status: 'ACTIVE',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2026-01-01'),
  premiumValueInCents: 200000,
  insurer: { name: 'Seguradora ABC' },
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(listInternalPoliciesRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockTenantPrisma.contact.findFirst.mockResolvedValue({
    clientId: 'client-001',
  })
  mockTenantPrisma.policy.findMany.mockResolvedValue([makePolicy()])
})

describe('GET /api/internal/policies', () => {
  it('returns active policies for a given clientId', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/policies',
      query: { clientId: 'client-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.policies).toHaveLength(1)
    expect(body.data.policies[0].id).toBe('policy-001')
    expect(body.data.policies[0].policyNumber).toBe('12345')
    expect(body.data.policies[0].insurerName).toBe('Seguradora ABC')
  })
  it('resolves clientId from phone when clientId is not provided', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/policies',
      query: { phone: '11999999999' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(mockTenantPrisma.contact.findFirst).toHaveBeenCalled()
  })
  it('returns empty list when client is not found', async () => {
    mockTenantPrisma.contact.findFirst.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/policies',
      query: { phone: '11000000000' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.policies).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })
  it('returns 400 when neither clientId nor phone is provided', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/policies',
    })
    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('MISSING_PARAMS')
  })
  it('returns policies with null insurer when insurer is absent', async () => {
    mockTenantPrisma.policy.findMany.mockResolvedValue([
      makePolicy({ insurer: null }),
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/policies',
      query: { clientId: 'client-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.policies[0].insurerName).toBeNull()
  })
})
