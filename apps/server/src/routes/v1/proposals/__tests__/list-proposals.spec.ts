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
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listProposalsRoute } from '../list-proposals.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

const makeProposal = (id: string) => {
  const base = {
    id,
    organizationId: TEST_ORG_ID,
    contactId: 'contact-001',
    salespersonId: 'user-001',
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
  }
  return { ...base, toJSON: () => base }
}

beforeAll(async () => {
  app = await createTestApp(listProposalsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/proposals', () => {
  it('returns 200 with list of proposals', async () => {
    mockExecute.mockResolvedValue({
      items: [makeProposal('p-001'), makeProposal('p-002')],
      nextCursor: null,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns pagination cursor in meta', async () => {
    mockExecute.mockResolvedValue({
      items: [makeProposal('p-001')],
      nextCursor: 'cursor-abc',
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('cursor-abc')
  })

  it('passes filters to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals',
      query: { stage: 'QUOTE', boardType: 'NEW_INSURANCE', search: 'auto' },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        stage: 'QUOTE',
        boardType: 'NEW_INSURANCE',
        search: 'auto',
      }),
      expect.anything()
    )
  })

  it('returns empty array when no proposals found', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toEqual([])
  })
})
