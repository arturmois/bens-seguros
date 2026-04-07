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
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listOccurrencesRoute } from '../list-occurrences.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listOccurrencesRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeOccurrence = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'occurrence-id-001',
  claimId: 'claim-id-001',
  organizationId: TEST_ORG_ID,
  type: 'STATUS_UPDATE',
  description: 'Documento recebido e em análise',
  metadata: null,
  createdBy: TEST_USER_ID,
  createdAt: new Date(),
  ...overrides,
})

describe('GET /api/v1/claims/:id/occurrences', () => {
  it('returns 200 with array of occurrences', async () => {
    mockExecute.mockResolvedValue([
      makeOccurrence(),
      makeOccurrence({ id: 'occurrence-id-002', type: 'INSPECTION' }),
    ])

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/claim-id-001/occurrences',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].type).toBe('STATUS_UPDATE')
    expect(body.data[1].type).toBe('INSPECTION')
  })

  it('returns 200 with empty array when no occurrences exist', async () => {
    mockExecute.mockResolvedValue([])

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/claim-id-001/occurrences',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })

  it('calls use case with claimId from URL and organizationId', async () => {
    mockExecute.mockResolvedValue([])

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/claim-id-001/occurrences',
    })

    expect(mockExecute).toHaveBeenCalledWith('claim-id-001', TEST_ORG_ID)
  })

  it('response has no pagination meta — plain array in data', async () => {
    mockExecute.mockResolvedValue([makeOccurrence()])

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/claims/claim-id-001/occurrences',
    })

    const body = response.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.meta).toBeUndefined()
  })
})
