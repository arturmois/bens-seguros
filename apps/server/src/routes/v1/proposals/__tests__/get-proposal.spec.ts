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
import { getProposalRoute } from '../get-proposal.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeProposal = (overrides: Partial<Record<string, unknown>> = {}) => {
  const base = {
    id: 'p-001',
    organizationId: TEST_ORG_ID,
    contactId: 'contact-001',
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
  app = await createTestApp(getProposalRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeProposal())
  mockResolve(mockExecute)
})

describe('GET /api/v1/proposals/:id', () => {
  it('returns 200 with proposal data', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/p-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('p-001')
    expect(body.data.stage).toBe('QUOTE')
    expect(body.data.branch).toBe('AUTO')
  })
  it('calls use case with id and organizationId', async () => {
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/p-001',
    })
    expect(mockExecute).toHaveBeenCalledWith('p-001', TEST_ORG_ID)
  })
  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposal not found')
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/nonexistent',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })
  it('returns premium and commission in cents', async () => {
    mockExecute.mockResolvedValue(
      makeProposal({
        premiumValueInCents: 250000,
        commissionPercentageInCents: 1500,
      })
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/p-001',
    })
    const body = response.json()
    expect(body.data.premiumValueInCents).toBe(250000)
    expect(body.data.commissionPercentageInCents).toBe(1500)
  })
})
