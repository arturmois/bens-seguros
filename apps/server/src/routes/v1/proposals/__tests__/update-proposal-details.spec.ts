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
import { updateProposalDetailsRoute } from '../update-proposal-details.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeProposal = (overrides: Partial<Record<string, unknown>> = {}) => {
  const base = {
    id: 'p-001',
    organizationId: TEST_ORG_ID,
    contactId: 'contact-001',
    salespersonId: 'user-001',
    stage: 'CAPTURE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 150000,
    commissionPercentageInCents: 1000,
    details: {
      branch: 'AUTO',
      brand: 'Toyota',
      model: 'Corolla',
      manufacturingYear: 2022,
      modelYear: 2023,
    },
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

const autoDetailsPayload = {
  details: {
    branch: 'AUTO',
    brand: 'Toyota',
    model: 'Corolla',
    manufacturingYear: 2022,
    modelYear: 2023,
  },
  premiumValueInCents: 150000,
  commissionBasisPoints: 1000,
}

beforeAll(async () => {
  app = await createTestApp(updateProposalDetailsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeProposal())
  mockResolve(mockExecute)
})

describe('PUT /api/v1/proposals/:id/details', () => {
  it('returns 200 with updated proposal', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/proposals/p-001/details',
      payload: autoDetailsPayload,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('p-001')
    expect(body.data.premiumValueInCents).toBe(150000)
  })
  it('calls use case with id, organizationId, and body', async () => {
    await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/proposals/p-001/details',
      payload: autoDetailsPayload,
    })
    expect(mockExecute).toHaveBeenCalledWith(
      'p-001',
      TEST_ORG_ID,
      expect.objectContaining({ premiumValueInCents: 150000 })
    )
  })
  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposal not found')
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/proposals/nonexistent/details',
      payload: autoDetailsPayload,
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })
  it('returns non-2xx when details body is missing required fields', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/proposals/p-001/details',
      payload: {
        premiumValueInCents: 150000,
        commissionBasisPoints: 1000,
      },
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
  it('accepts LIFE branch details', async () => {
    mockExecute.mockResolvedValue(
      makeProposal({
        branch: 'LIFE',
        details: { branch: 'LIFE', occupation: 'Médico' },
      })
    )
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/proposals/p-001/details',
      payload: {
        details: { branch: 'LIFE', occupation: 'Médico' },
        premiumValueInCents: 50000,
        commissionBasisPoints: 500,
      },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.branch).toBe('LIFE')
  })
})
