import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { container } from '@repo/core'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { createInternalClaimRoute } from '../create-claim.js'

const mockTenantPrisma = {
  client: {
    findFirst: vi.fn(),
  },
  policy: {
    findFirst: vi.fn(),
  },
}

vi.mock('@repo/db/tenant', () => ({
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))

const mockExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

const makeClient = () => ({
  id: 'client-001',
  name: 'João Silva',
  organizationId: TEST_ORG_ID,
  deletedAt: null,
})

const makePolicy = () => ({
  id: 'policy-001',
  organizationId: TEST_ORG_ID,
  clientId: 'client-001',
  insurerId: 'insurer-001',
  status: 'ACTIVE',
  branch: 'AUTO',
  endDate: new Date('2026-01-01'),
})

const makeClaim = () => ({
  id: 'claim-001',
  claimNumber: 42,
  organizationId: TEST_ORG_ID,
})

const makeBody = (overrides: Partial<Record<string, unknown>> = {}) => ({
  phoneOrDocument: '11999999999',
  description: 'Colisão traseira',
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(createInternalClaimRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockTenantPrisma.client.findFirst.mockResolvedValue(makeClient())
  mockTenantPrisma.policy.findFirst.mockResolvedValue(makePolicy())
  mockExecute.mockResolvedValue(makeClaim())
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') return { execute: mockExecute }
    return null
  })
})

describe('POST /api/internal/claims', () => {
  it('creates a claim and returns claimNumber when client and policy exist', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody(),
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.claimCreated).toBe(true)
    expect(body.data.claimNumber).toBe('SIN-42')
    expect(mockExecute).toHaveBeenCalledOnce()
  })

  it('returns dataSaved=true without creating claim when client is not found', async () => {
    mockTenantPrisma.client.findFirst.mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody({ phoneOrDocument: '11000000000' }),
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.data.claimCreated).toBe(false)
    expect(body.data.dataSaved).toBe(true)
    expect(body.data.claimData).toBeDefined()
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns dataSaved=true without creating claim when no active policy is found', async () => {
    mockTenantPrisma.policy.findFirst.mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody(),
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.data.claimCreated).toBe(false)
    expect(body.data.dataSaved).toBe(true)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: { phoneOrDocument: '11999999999' },
    })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('accepts optional incidentDate and incidentLocation', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/internal/claims',
      payload: makeBody({
        incidentDate: '2025-06-01',
        incidentLocation: 'Av. Paulista, 1000',
        insuranceType: 'AUTO',
      }),
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.data.claimCreated).toBe(true)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentLocation: 'Av. Paulista, 1000',
      })
    )
  })
})
