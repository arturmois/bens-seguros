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
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { advanceProposalRoute } from '../advance-proposal.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeProposal = (overrides: Partial<Record<string, unknown>> = {}) => {
  const base = {
    id: 'p-001',
    organizationId: TEST_ORG_ID,
    clientId: 'c-001',
    salespersonId: 'user-001',
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 100000,
    commissionPercentageInCents: 1000,
    details: null,
    lostReason: null,
    renewalPolicyId: null,
    renewalPolicyNumber: null,
    sourcePolicyId: null,
    endorsementType: null,
    endorsementReason: null,
    sourcePolicySnapshot: null,
    insurerId: null,
    deletedAt: null,
    coverageStartDate: null,
    coverageEndDate: null,
    sentToClientAt: null,
    clientResponseAt: null,
    quoteValidUntil: null,
    createdAt: new Date('2025-01-01').toISOString(),
    updatedAt: new Date('2025-01-01').toISOString(),
    ...overrides,
  }
  return { ...base, toJSON: () => base }
}

beforeAll(async () => {
  app = await createTestApp(advanceProposalRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeProposal({ stage: 'QUOTE' }))
  mockResolve(mockExecute)
})

describe('POST /api/v1/proposals/:id/advance', () => {
  it('returns 200 with advanced proposal', async () => {
    // No body — omit content-type to avoid FST_ERR_CTP_EMPTY_JSON_BODY
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/advance',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('p-001')
    expect(body.data.stage).toBe('QUOTE')
  })

  it('calls use case with id and organizationId', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/advance',
    })

    expect(mockExecute).toHaveBeenCalledWith('p-001', TEST_ORG_ID)
  })

  it('returns 422 on INVALID_STAGE_TRANSITION error', async () => {
    mockResolveError('INVALID_STAGE_TRANSITION', 'Cannot advance from LOST')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/advance',
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('INVALID_STAGE_TRANSITION')
  })

  it('returns 422 on CHECKLIST_INCOMPLETE error', async () => {
    mockResolveError('CHECKLIST_INCOMPLETE', 'Checklist not complete')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/advance',
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('CHECKLIST_INCOMPLETE')
  })

  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposal not found')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/nonexistent/advance',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })
})
