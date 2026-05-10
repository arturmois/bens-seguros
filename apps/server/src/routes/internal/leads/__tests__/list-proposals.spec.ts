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
import { listInternalProposalsRoute } from '../list-proposals.js'

const mockTenantPrisma = {
  contact: {
    findFirst: vi.fn(),
  },
  proposal: {
    findMany: vi.fn(),
  },
}

vi.mock('@repo/db/tenant', () => ({
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))

let app: Awaited<ReturnType<typeof createTestApp>>

const makeProposal = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'proposal-001',
  organizationId: TEST_ORG_ID,
  contactId: 'contact-001',
  branch: 'AUTO',
  stage: 'CAPTURE',
  premiumValueInCents: 150000,
  coverageStartDate: null,
  createdAt: new Date('2025-01-01'),
  contact: { name: 'João Silva' },
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(listInternalProposalsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockTenantPrisma.contact.findFirst.mockResolvedValue({
    clientId: 'client-001',
  })
  mockTenantPrisma.proposal.findMany.mockResolvedValue([makeProposal()])
})

describe('GET /api/internal/proposals', () => {
  it('returns proposals for a given clientId', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
      query: { clientId: 'client-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.proposals).toHaveLength(1)
    expect(body.data.proposals[0].id).toBe('proposal-001')
    expect(body.data.proposals[0].clientName).toBe('João Silva')
  })
  it('resolves clientId from phone when clientId is not provided', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
      query: { phone: '11999999999' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(mockTenantPrisma.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ phone: '11999999999' }),
      })
    )
  })
  it('returns empty list when client is not found by phone', async () => {
    mockTenantPrisma.contact.findFirst.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
      query: { phone: '11000000000' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.proposals).toHaveLength(0)
    expect(body.data.total).toBe(0)
  })
  it('returns 400 when neither clientId nor phone is provided', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
    })
    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('MISSING_PARAMS')
  })
  it('returns total matching proposals count', async () => {
    mockTenantPrisma.proposal.findMany.mockResolvedValue([
      makeProposal({ id: 'p-001' }),
      makeProposal({ id: 'p-002' }),
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/proposals',
      query: { clientId: 'client-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.total).toBe(2)
  })
})
