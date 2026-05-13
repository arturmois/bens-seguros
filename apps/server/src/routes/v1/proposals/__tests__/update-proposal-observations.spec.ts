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
import { updateProposalObservationsRoute } from '../update-proposal-observations.js'

vi.mock('../../../../middlewares/ability-middleware.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../middlewares/ability-middleware.js')
  >('../../../../middlewares/ability-middleware.js')
  return { requireAbility: actual.requireAbility }
})

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
    observations: 'Cliente VIP',
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
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-01').toISOString(),
    ...overrides,
  }
  return { ...base, toJSON: () => base }
}

beforeAll(async () => {
  app = await createTestApp(updateProposalObservationsRoute)
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('PATCH /api/v1/proposals/:id/observations', () => {
  it('returns 200 with updated proposal when observations set', async () => {
    mockExecute.mockResolvedValueOnce(
      makeProposal({ observations: 'Nova nota' })
    )
    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/observations',
      payload: { observations: 'Nova nota' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.observations).toBe('Nova nota')
    expect(mockExecute).toHaveBeenCalledWith('p-001', TEST_ORG_ID, 'Nova nota')
  })

  it('returns 200 when observations cleared to null', async () => {
    mockExecute.mockResolvedValueOnce(makeProposal({ observations: null }))
    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/observations',
      payload: { observations: null },
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data.observations).toBeNull()
    expect(mockExecute).toHaveBeenCalledWith('p-001', TEST_ORG_ID, null)
  })

  it('returns 404 when proposal not found', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposta não encontrada')
    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/missing/observations',
      payload: { observations: 'x' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('PROPOSAL_NOT_FOUND')
  })

  it('returns 400 when observations exceeds 2000 chars', async () => {
    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/observations',
      payload: { observations: 'a'.repeat(2001) },
    })
    expect(response.statusCode).toBe(400)
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns 403 when VIEWER tries to update', async () => {
    setTestContext({ role: 'VIEWER' })
    const response = await injectAs(app, {
      method: 'PATCH',
      url: '/api/v1/proposals/p-001/observations',
      payload: { observations: 'x' },
    })
    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('FORBIDDEN')
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
