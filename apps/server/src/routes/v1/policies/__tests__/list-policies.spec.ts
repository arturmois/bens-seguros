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
import { listPoliciesRoute } from '../list-policies.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listPoliciesRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makePolicy = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'policy-id-001',
  organizationId: TEST_ORG_ID,
  proposalId: 'proposal-id-001',
  clientId: 'client-id-001',
  salespersonId: 'user-id-001',
  policyNumber: 'POL-2026-001',
  status: 'ACTIVE',
  branch: 'AUTO',
  premiumValueInCents: 150000,
  coverageDetails: null,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2027-01-01'),
  cancelledAt: null,
  cancelReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('GET /api/v1/policies', () => {
  it('returns 200 with empty list when no policies exist', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with policies list and pagination cursor', async () => {
    mockExecute.mockResolvedValue({
      items: [makePolicy()],
      nextCursor: 'cursor-abc',
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].policyNumber).toBe('POL-2026-001')
    expect(body.meta.nextCursor).toBe('cursor-abc')
  })

  it('passes filters and pagination to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies',
      query: { status: 'ACTIVE', branch: 'AUTO', limit: '10' },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        status: 'ACTIVE',
        branch: 'AUTO',
      }),
      expect.objectContaining({ limit: 10 })
    )
  })

  it('passes clientId and search filters to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies',
      query: { clientId: 'client-id-001', search: 'POL-2026' },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-id-001',
        search: 'POL-2026',
      }),
      expect.anything()
    )
  })

  it('parses statusIn=ACTIVE,EXPIRED and forwards array to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies?statusIn=ACTIVE,EXPIRED',
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ statusIn: ['ACTIVE', 'EXPIRED'] }),
      expect.anything()
    )
  })

  it('parses branchIn=AUTO,LIFE and forwards array to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies?branchIn=AUTO,LIFE',
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ branchIn: ['AUTO', 'LIFE'] }),
      expect.anything()
    )
  })

  it('parses boardTypeIn=RENEWAL,ENDORSEMENT and forwards array to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies?boardTypeIn=RENEWAL,ENDORSEMENT',
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ boardTypeIn: ['RENEWAL', 'ENDORSEMENT'] }),
      expect.anything()
    )
  })

  it('returns 400 when statusIn contains an invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies?statusIn=ACTIVE,INVALID',
    })

    expect(response.statusCode).toBe(400)
  })

  it('accepts both status=ACTIVE and statusIn=EXPIRED in same request', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies?status=ACTIVE&statusIn=EXPIRED',
    })

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', statusIn: ['EXPIRED'] }),
      expect.anything()
    )
  })

  it('omits all in-filters when query has no plurals', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies',
    })

    const callArg = mockExecute.mock.calls[0]?.[0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('statusIn')
    expect(callArg).not.toHaveProperty('branchIn')
    expect(callArg).not.toHaveProperty('boardTypeIn')
  })
})
