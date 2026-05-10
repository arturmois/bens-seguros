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
import { getEndorsementRoute } from '../get-endorsement.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getEndorsementRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeEndorsement = () => ({
  id: 'endorsement-id-001',
  organizationId: TEST_ORG_ID,
  policyId: 'policy-id-001',
  type: 'COVERAGE_CHANGE',
  description: 'Added life coverage',
  effectiveDate: new Date().toISOString(),
  previousVersionSnapshot: {},
  changes: {},
  createdBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('GET /api/v1/endorsements/:id', () => {
  it('returns 200 with endorsement data on valid id', async () => {
    mockExecute.mockResolvedValue(makeEndorsement())
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/endorsements/endorsement-id-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('endorsement-id-001')
    expect(body.data.organizationId).toBe(TEST_ORG_ID)
    expect(body.data.policyId).toBe('policy-id-001')
  })
  it('returns 404 when endorsement is not found', async () => {
    mockResolveError('ENDORSEMENT_NOT_FOUND', 'Endorsement not found')
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/endorsements/nonexistent-id',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ENDORSEMENT_NOT_FOUND')
  })
})
