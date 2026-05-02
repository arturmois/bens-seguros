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
import { searchClientsRoute } from '../search-clients.js'

const mockTenantPrisma = {
  client: {
    findFirst: vi.fn(),
  },
  contact: {
    findFirst: vi.fn(),
  },
  policy: {
    count: vi.fn(),
  },
  proposal: {
    count: vi.fn(),
  },
}

vi.mock('@repo/db/tenant', () => ({
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))

let app: Awaited<ReturnType<typeof createTestApp>>

const makeContactWithClient = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  id: 'contact-001',
  organizationId: TEST_ORG_ID,
  name: 'João Silva',
  phone: '11999999999',
  email: 'joao@example.com',
  deletedAt: null,
  client: {
    id: 'client-001',
    organizationId: TEST_ORG_ID,
    legalName: 'João Silva',
    document: '12345678901',
    deletedAt: null,
  },
  ...overrides,
})

const makeClient = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'client-001',
  organizationId: TEST_ORG_ID,
  legalName: 'João Silva',
  document: '12345678901',
  deletedAt: null,
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(searchClientsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockTenantPrisma.contact.findFirst.mockResolvedValue(makeContactWithClient())
  mockTenantPrisma.client.findFirst.mockResolvedValue(makeClient())
  mockTenantPrisma.policy.count.mockResolvedValue(2)
  mockTenantPrisma.proposal.count.mockResolvedValue(1)
})

describe('GET /api/internal/clients/search', () => {
  it('returns client with policy and proposal counts when found by phone', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/clients/search',
      query: { phone: '11999999999' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.found).toBe(true)
    expect(body.data.client?.id).toBe('client-001')
    expect(body.data.client?.hasActivePolicy).toBe(true)
    expect(body.data.client?.activePoliciesCount).toBe(2)
    expect(body.data.client?.openProposalsCount).toBe(1)
  })

  it('returns found=false when contact does not exist by phone', async () => {
    mockTenantPrisma.contact.findFirst.mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/clients/search',
      query: { phone: '11000000000' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.found).toBe(false)
    expect(body.data.client).toBeNull()
  })

  it('returns 400 when neither phone nor document is provided', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/clients/search',
    })

    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('MISSING_PARAMS')
  })

  it('searches by document hash when document is provided', async () => {
    // For document path, the route calls client.findFirst first, then
    // contact.findFirst (without `client` include) for email/phone.
    mockTenantPrisma.contact.findFirst.mockResolvedValue({
      email: 'joao@example.com',
      phone: '11999999999',
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/clients/search',
      query: { document: '123.456.789-09' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockTenantPrisma.client.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ documentHash: expect.any(String) }),
      })
    )
  })

  it('returns hasActivePolicy=false when no active policies exist', async () => {
    mockTenantPrisma.policy.count.mockResolvedValue(0)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/clients/search',
      query: { phone: '11999999999' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.client?.hasActivePolicy).toBe(false)
    expect(body.data.client?.activePoliciesCount).toBe(0)
  })
})
