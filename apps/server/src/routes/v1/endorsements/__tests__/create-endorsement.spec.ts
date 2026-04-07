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
import { createEndorsementRoute } from '../create-endorsement.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createEndorsementRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeEndorsement = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'endorsement-id-001',
  organizationId: TEST_ORG_ID,
  policyId: 'policy-id-001',
  type: 'COVERAGE_CHANGE',
  description: 'Added life coverage',
  effectiveDate: new Date().toISOString(),
  previousVersionSnapshot: { premium: 50000 },
  changes: { premium: 60000 },
  createdBy: 'user-id-001',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const validBody = {
  policyId: 'policy-id-001',
  type: 'COVERAGE_CHANGE',
  description: 'Added life coverage',
  effectiveDate: new Date().toISOString(),
  previousVersionSnapshot: { premium: 50000 },
  changes: { premium: 60000 },
}

describe('POST /api/v1/endorsements', () => {
  it('returns 201 with endorsement data on valid request', async () => {
    mockExecute.mockResolvedValue(makeEndorsement())

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/endorsements',
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.organizationId).toBe(TEST_ORG_ID)
    expect(body.data.policyId).toBe('policy-id-001')
    expect(body.data.type).toBe('COVERAGE_CHANGE')
  })

  it('returns 400 when policyId is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/endorsements',
      payload: { ...validBody, policyId: undefined },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when description is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/endorsements',
      payload: { ...validBody, description: '' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 422 when source policy is not eligible', async () => {
    mockResolveError(
      'SOURCE_POLICY_NOT_ELIGIBLE',
      'Source policy is not eligible for endorsement'
    )

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/endorsements',
      payload: validBody,
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('SOURCE_POLICY_NOT_ELIGIBLE')
  })

  it('returns 404 when policy is not found', async () => {
    mockResolveError('POLICY_NOT_FOUND', 'Policy not found')

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/endorsements',
      payload: validBody,
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('POLICY_NOT_FOUND')
  })
})
