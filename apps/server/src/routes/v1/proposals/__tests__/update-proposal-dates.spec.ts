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
import { updateProposalDatesRoute } from '../update-proposal-dates.js'

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
    coverageStartDate: '2025-01-01T00:00:00.000Z',
    coverageEndDate: '2026-01-01T00:00:00.000Z',
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
  app = await createTestApp(updateProposalDatesRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(makeProposal())
  mockResolve(mockExecute)
})

describe('PATCH /api/v1/proposals/:id/dates', () => {
  it('returns 200 with updated proposal dates', async () => {
    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/dates',
      payload: {
        coverageStartDate: '2025-01-01',
        coverageEndDate: '2026-01-01',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('p-001')
  })

  it('calls use case with id, organizationId, and date body', async () => {
    await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/dates',
      payload: {
        coverageStartDate: '2025-06-01',
        coverageEndDate: '2026-06-01',
      },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      'p-001',
      TEST_ORG_ID,
      expect.objectContaining({
        coverageStartDate: expect.any(Date),
        coverageEndDate: expect.any(Date),
      })
    )
  })

  it('returns 422 on INVALID_COVERAGE_DATES error', async () => {
    mockResolveError('INVALID_COVERAGE_DATES', 'Invalid coverage dates')

    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/dates',
      payload: {
        coverageStartDate: '2026-01-01',
        coverageEndDate: '2025-01-01',
      },
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('INVALID_COVERAGE_DATES')
  })

  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposal not found')

    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/nonexistent/dates',
      payload: { coverageStartDate: '2025-01-01' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })

  it('accepts empty body (all fields optional)', async () => {
    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/dates',
      payload: {},
    })

    expect(response.statusCode).toBe(200)
  })
})
