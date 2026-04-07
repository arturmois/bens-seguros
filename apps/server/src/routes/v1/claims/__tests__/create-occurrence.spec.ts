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
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { createOccurrenceRoute } from '../create-occurrence.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createOccurrenceRoute)
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

const validBody = {
  type: 'STATUS_UPDATE',
  description: 'Documento recebido e em análise',
}

describe('POST /api/v1/claims/:id/occurrences', () => {
  it('returns 201 with occurrence detail on valid creation', async () => {
    mockExecute.mockResolvedValue(makeOccurrence())

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-001/occurrences',
      payload: validBody,
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.type).toBe('STATUS_UPDATE')
    expect(body.data.claimId).toBe('claim-id-001')
  })

  it('sets createdBy from authenticated user id', async () => {
    mockExecute.mockResolvedValue(makeOccurrence())

    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-001/occurrences',
      payload: validBody,
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        claimId: 'claim-id-001',
        createdBy: TEST_USER_ID,
      })
    )
  })

  it('passes claimId from URL param to use case', async () => {
    mockExecute.mockResolvedValue(makeOccurrence({ claimId: 'claim-id-999' }))

    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-999/occurrences',
      payload: validBody,
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ claimId: 'claim-id-999' })
    )
  })

  it('returns 404 when claim does not exist', async () => {
    mockResolveError(
      'OCCURRENCE_CLAIM_NOT_FOUND',
      'Claim not found for occurrence'
    )

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/nonexistent-id/occurrences',
      payload: validBody,
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('OCCURRENCE_CLAIM_NOT_FOUND')
  })

  it('returns 400 when type is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/claims/claim-id-001/occurrences',
      payload: { description: 'Only description, no type' },
    })

    expect(response.statusCode).toBe(400)
  })
})
