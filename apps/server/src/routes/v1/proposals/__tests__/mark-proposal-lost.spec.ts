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
import { markProposalLostRoute } from '../mark-proposal-lost.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeProposal = (overrides: Partial<Record<string, unknown>> = {}) => {
  const base = {
    id: 'p-001',
    organizationId: TEST_ORG_ID,
    contactId: 'contact-001',
    salespersonId: 'user-001',
    stage: 'LOST',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 100000,
    commissionPercentageInCents: 1000,
    details: null,
    lostReason: 'Cliente escolheu outra seguradora',
    observations: null,
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
  app = await createTestApp(markProposalLostRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeProposal())
  mockResolve(mockExecute)
})

describe('POST /api/v1/proposals/:id/lost', () => {
  it('returns 200 with lost proposal', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals/p-001/lost',
      payload: { reason: 'Cliente escolheu outra seguradora' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.stage).toBe('LOST')
    expect(body.data.lostReason).toBe('Cliente escolheu outra seguradora')
  })
  it('calls use case with id, organizationId, and reason', async () => {
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals/p-001/lost',
      payload: { reason: 'Preço alto demais' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      'p-001',
      TEST_ORG_ID,
      'Preço alto demais'
    )
  })
  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposal not found')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals/nonexistent/lost',
      payload: { reason: 'Cancelamento' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })
  it('returns non-2xx when reason is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals/p-001/lost',
      payload: {},
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
  it('returns 422 on INVALID_STAGE_TRANSITION error', async () => {
    mockResolveError(
      'INVALID_STAGE_TRANSITION',
      'Cannot mark as lost from POLICY_ISSUED'
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals/p-001/lost',
      payload: { reason: 'Desistência' },
    })
    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('INVALID_STAGE_TRANSITION')
  })
})
