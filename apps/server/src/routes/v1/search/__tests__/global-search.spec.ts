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
import { globalSearchRoute } from '../global-search.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(globalSearchRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
  mockExecute.mockResolvedValue({
    clients: [],
    proposals: [],
    policies: [],
    claims: [],
  })
})

describe('GET /api/v1/search', () => {
  it('returns 200 with search results across all entities', async () => {
    mockExecute.mockResolvedValue({
      clients: [
        { id: 'client-001', name: 'João Silva', document: '123.456.789-00' },
      ],
      proposals: [],
      policies: [
        {
          id: 'policy-001',
          policyNumber: 'POL-001',
          branch: 'AUTO',
          clientName: 'João Silva',
        },
      ],
      claims: [],
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
      query: { q: 'João' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.clients).toHaveLength(1)
    expect(body.data.clients[0].type).toBe('CLIENT')
    expect(body.data.policies).toHaveLength(1)
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
  it('forwards organizationId, query, and limit to the use case', async () => {
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
      query: { q: 'test', limit: '20' },
    })
    expect(mockExecute).toHaveBeenCalledWith(TEST_ORG_ID, 'test', 20)
  })
})
