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
} from '../../../../__tests__/helpers/create-test-app.js'
import { globalSearchRoute } from '../global-search.js'

const mockClientFindMany = vi.fn()
const mockProposalFindMany = vi.fn()
const mockPolicyFindMany = vi.fn()
const mockClaimFindMany = vi.fn()

const mockTenantPrisma = {
  client: { findMany: mockClientFindMany },
  proposal: { findMany: mockProposalFindMany },
  policy: { findMany: mockPolicyFindMany },
  claim: { findMany: mockClaimFindMany },
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(globalSearchRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext({ tenantPrisma: mockTenantPrisma })
  mockClientFindMany.mockResolvedValue([])
  mockProposalFindMany.mockResolvedValue([])
  mockPolicyFindMany.mockResolvedValue([])
  mockClaimFindMany.mockResolvedValue([])
})

describe('GET /api/v1/search', () => {
  it('returns 200 with search results across all entities', async () => {
    mockClientFindMany.mockResolvedValue([
      {
        id: 'client-001',
        legalName: 'João Silva',
        document: '123.456.789-00',
      },
    ])
    mockPolicyFindMany.mockResolvedValue([
      {
        id: 'policy-001',
        policyNumber: 'POL-001',
        branch: 'AUTO',
        client: { legalName: 'João Silva' },
      },
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
      query: { q: 'João' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.clients).toHaveLength(1)
    expect(body.data.proposals).toHaveLength(0)
    expect(body.data.policies).toHaveLength(1)
    expect(body.data.claims).toHaveLength(0)
    expect(body.meta.query).toBe('João')
    expect(body.meta.totalResults).toBe(2)
  })
  it('returns 200 with empty results when no matches found', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
      query: { q: 'noresult' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.clients).toHaveLength(0)
    expect(body.data.proposals).toHaveLength(0)
    expect(body.data.policies).toHaveLength(0)
    expect(body.data.claims).toHaveLength(0)
    expect(body.meta.totalResults).toBe(0)
  })
  it('returns 400 when q param is missing', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when q param is shorter than minimum length', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
      query: { q: 'a' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('queries all 4 entity types in parallel', async () => {
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
      query: { q: 'test' },
    })
    expect(mockClientFindMany).toHaveBeenCalledOnce()
    expect(mockProposalFindMany).toHaveBeenCalledOnce()
    expect(mockPolicyFindMany).toHaveBeenCalledOnce()
    expect(mockClaimFindMany).toHaveBeenCalledOnce()
  })
})
