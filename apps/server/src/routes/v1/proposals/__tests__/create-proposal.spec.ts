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
import { createProposalRoute } from '../create-proposal.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeProposal = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'p-001',
  organizationId: TEST_ORG_ID,
  clientId: 'c-001',
  salespersonId: TEST_USER_ID,
  stage: 'CAPTURE',
  boardType: 'NEW_INSURANCE',
  branch: 'AUTO',
  premiumValueInCents: 0,
  commissionPercentageInCents: 0,
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
})

beforeAll(async () => {
  app = await createTestApp(createProposalRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  const proposal = makeProposal()
  const proposalWithToJSON = { ...proposal, toJSON: () => proposal }
  mockExecute.mockResolvedValue(proposalWithToJSON)
  mockResolve(mockExecute)
})

describe('POST /api/v1/proposals', () => {
  it('returns 201 with proposal for NEW_INSURANCE board type', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      payload: {
        boardType: 'NEW_INSURANCE',
        clientId: 'c-001',
        branch: 'AUTO',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('p-001')
    expect(body.data.stage).toBe('CAPTURE')
  })

  it('calls use case with organizationId and salespersonId from request context', async () => {
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      payload: {
        boardType: 'NEW_INSURANCE',
        clientId: 'c-001',
        branch: 'AUTO',
      },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        salespersonId: TEST_USER_ID,
      })
    )
  })

  it('returns 201 with proposal for ENDORSEMENT board type', async () => {
    const endorsement = makeProposal({
      boardType: 'ENDORSEMENT',
      sourcePolicyId: 'pol-001',
      endorsementType: 'ADDRESS_CHANGE',
      endorsementReason: 'Cliente mudou de endereço',
    })
    const endorsementWithToJSON = { ...endorsement, toJSON: () => endorsement }
    mockExecute.mockResolvedValue(endorsementWithToJSON)

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      payload: {
        boardType: 'ENDORSEMENT',
        sourcePolicyId: 'pol-001',
        endorsementType: 'ADDRESS_CHANGE',
        endorsementReason: 'Cliente mudou de endereço',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.boardType).toBe('ENDORSEMENT')
  })

  it('returns non-2xx when required fields are missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      payload: { boardType: 'NEW_INSURANCE' },
    })

    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('returns 422 on domain error', async () => {
    mockResolveError('SOURCE_POLICY_NOT_ELIGIBLE', 'Policy is not eligible')

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      payload: {
        boardType: 'ENDORSEMENT',
        sourcePolicyId: 'pol-001',
        endorsementType: 'ADDRESS_CHANGE',
        endorsementReason: 'Mudança de endereço',
      },
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('SOURCE_POLICY_NOT_ELIGIBLE')
  })
})
