import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'
import { listInternalPoliciesRoute } from '../list-policies.js'

const mockExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((fastify) =>
    listInternalPoliciesRoute(fastify, {
      listPoliciesFor: () => ({ execute: mockExecute }),
    })
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue({
    policies: [
      {
        id: 'policy-001',
        policyNumber: '12345',
        branch: 'AUTO',
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01'),
        premiumValueInCents: 200000,
        insurerName: 'Seguradora ABC',
      },
    ],
    total: 1,
  })
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
    expect(body.data.policies[0].policyNumber).toBe('12345')
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
    expect(body.error.message).toBe(
      'At least one of clientId or phone is required'
    )
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
